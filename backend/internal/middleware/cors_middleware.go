package middleware

import (
	"log/slog"
	"net/url"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
)

type CORSMiddleware struct {
	cfg           *config.Config
	customOrigins []string
}

func NewCORSMiddleware(cfg *config.Config) *CORSMiddleware {
	return &CORSMiddleware{cfg: cfg}
}

func (m *CORSMiddleware) WithOrigins(origins []string) *CORSMiddleware {
	clone := *m
	clone.customOrigins = append([]string(nil), origins...)
	return &clone
}

func (m *CORSMiddleware) Add() gin.HandlerFunc {
	conf := cors.DefaultConfig()
	conf.AllowOrigins = deriveAllowedOrigins(m.cfg, m.customOrigins)
	conf.AllowCredentials = true
	conf.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"}
	conf.AllowHeaders = []string{
		"Authorization",
		"Content-Type",
		"X-CSRF-Token",
		"X-Requested-With",
		"Accept",
		"Accept-Language",
		"Accept-Encoding",
		"User-Agent",
		"Cache-Control",
		"Origin",
		"Referer",
		"X-Arcane-Agent-Token",
	}
	conf.ExposeHeaders = []string{
		"Content-Length",
		"Content-Type",
		"X-Total-Count",
		"X-Page",
		"X-Per-Page",
	}
	conf.MaxAge = 300

	return cors.New(conf)
}

func deriveAllowedOrigins(cfg *config.Config, custom []string) []string {
	if len(custom) > 0 {
		return dedupe(custom)
	}

	var origins []string
	// App URL if set
	if cfg != nil && cfg.AppUrl != "" {
		if u, err := url.Parse(cfg.AppUrl); err == nil {
			origins = append(origins, u.Scheme+"://"+u.Host)
		}
	}

	// Dev defaults
	if cfg == nil || cfg.Environment != "production" {
		origins = append(origins,
			"http://localhost:3000", "http://127.0.0.1:3000",
			"http://localhost:3552", "http://127.0.0.1:3552",
		)
	}

	origins = dedupe(origins)

	if len(origins) == 0 {
		if cfg != nil && cfg.Environment == "production" {
			slog.Warn("CORS: No origins specified for production - defaulting to https://localhost")
			return []string{"https://localhost"}
		}
		// Fallback in dev (avoid "*" with credentials=true)
		return []string{"http://localhost:3000"}
	}

	return origins
}

func dedupe(in []string) []string {
	seen := make(map[string]struct{}, len(in))
	out := make([]string, 0, len(in))
	for _, v := range in {
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}
