package middleware

import (
	"log"
	"net/url"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
)

func SetupCORS(cfg *config.Config) gin.HandlerFunc {
	corsConfig := cors.DefaultConfig()

	allowedOrigins := []string{}

	if cfg.AppUrl != "" {
		if parsedURL, err := url.Parse(cfg.AppUrl); err == nil {
			origin := parsedURL.Scheme + "://" + parsedURL.Host
			allowedOrigins = append(allowedOrigins, origin)
		}
	}

	if cfg.Environment != "production" {
		devOrigins := []string{
			"http://localhost:3000",
			"http://localhost:8080",
		}
		allowedOrigins = append(allowedOrigins, devOrigins...)
	}

	if len(allowedOrigins) == 0 {
		if cfg.Environment == "production" {
			log.Printf("⚠️  CORS: No origins specified for production - this may cause issues")
			allowedOrigins = []string{"https://localhost"}
		} else {
			allowedOrigins = []string{"*"}
		}
	}

	corsConfig.AllowOrigins = allowedOrigins
	corsConfig.AllowCredentials = true
	corsConfig.AllowMethods = []string{
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"OPTIONS",
		"PATCH",
		"HEAD",
	}
	corsConfig.AllowHeaders = []string{
		"Authorization",
		"Content-Type",
		"X-CSRF-Token",
		"Origin",
		"Accept",
		"User-Agent",
		"Cache-Control",
		"X-Requested-With",
		"Accept-Encoding",
		"Accept-Language",
		"Connection",
		"Host",
		"Referer",
	}
	corsConfig.ExposeHeaders = []string{
		"Content-Length",
		"Content-Type",
		"X-Total-Count",
		"X-Page",
		"X-Per-Page",
	}
	corsConfig.MaxAge = 300

	return cors.New(corsConfig)
}

func SetupCORSWithCustomOrigins(cfg *config.Config, customOrigins []string) gin.HandlerFunc {
	corsConfig := cors.DefaultConfig()

	if len(customOrigins) > 0 {
		corsConfig.AllowOrigins = customOrigins
	} else {
		return SetupCORS(cfg)
	}

	corsConfig.AllowCredentials = true
	corsConfig.AllowMethods = []string{
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"OPTIONS",
		"PATCH",
		"HEAD",
	}
	corsConfig.AllowHeaders = []string{
		"Authorization",
		"Content-Type",
		"X-CSRF-Token",
		"Origin",
		"Accept",
		"User-Agent",
		"Cache-Control",
		"X-Requested-With",
		"Accept-Encoding",
		"Accept-Language",
		"Connection",
		"Host",
		"Referer",
	}
	corsConfig.ExposeHeaders = []string{
		"Content-Length",
		"Content-Type",
		"X-Total-Count",
		"X-Page",
		"X-Per-Page",
	}
	corsConfig.MaxAge = 300

	return cors.New(corsConfig)
}

func GetAllowedOrigins(cfg *config.Config) []string {
	allowedOrigins := []string{}

	if cfg.AppUrl != "" {
		if parsedURL, err := url.Parse(cfg.AppUrl); err == nil {
			origin := parsedURL.Scheme + "://" + parsedURL.Host
			allowedOrigins = append(allowedOrigins, origin)
		}
	}

	if cfg.Environment != "production" {
		devOrigins := []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:4173",
			"http://127.0.0.1:4173",
		}
		allowedOrigins = append(allowedOrigins, devOrigins...)
	}

	if len(allowedOrigins) == 0 {
		if cfg.Environment == "production" {
			allowedOrigins = []string{"https://localhost"}
		} else {
			allowedOrigins = []string{"*"}
		}
	}

	return allowedOrigins
}
