package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
	wsutil "github.com/ofkm/arcane-backend/internal/utils/ws"
)

// EnvResolver should return the environment api url, optional access token, whether the env is enabled, and an error.
type EnvResolver func(ctx context.Context, id string) (apiURL string, accessToken *string, enabled bool, err error)

// NewEnvProxyMiddleware preserves the previous API and uses "id" as the param name.
func NewEnvProxyMiddleware(localID string, resolver EnvResolver) gin.HandlerFunc {
	return NewEnvProxyMiddlewareWithParam(localID, "id", resolver, nil)
}

// NewEnvProxyMiddlewareWithParam returns a gin middleware that proxies requests whose environment id
// is remote. paramName is the URL param key (e.g. "id") that contains the environment id when using
// router groups; if that param is not present the middleware will attempt to auto-detect the id
// by parsing the request path after the first "/environments/" segment.
//
//nolint:gocognit
func NewEnvProxyMiddlewareWithParam(localID string, paramName string, resolver EnvResolver, envService *services.EnvironmentService) gin.HandlerFunc {
	m := &EnvironmentMiddleware{
		localID:    localID,
		resolver:   resolver,
		envService: envService,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
	return m.handle(paramName)
}

type EnvironmentMiddleware struct {
	localID    string
	resolver   EnvResolver
	envService *services.EnvironmentService
	httpClient *http.Client
}

func (m *EnvironmentMiddleware) handle(paramName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		envID := c.Param(paramName)

		// Fallback: try to auto-detect env id from path like "/.../environments/<envID>/..."
		if envID == "" {
			const marker = "/environments/"
			if idx := strings.Index(c.Request.URL.Path, marker); idx >= 0 {
				rest := c.Request.URL.Path[idx+len(marker):]
				parts := strings.SplitN(rest, "/", 2)
				if len(parts) > 0 && parts[0] != "" {
					envID = parts[0]
				}
			}
		}

		if envID == "" || envID == m.localID {
			c.Next()
			return
		}

		apiURL, accessToken, enabled, err := m.resolver(c.Request.Context(), envID)
		if err != nil || apiURL == "" {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
			c.Abort()
			return
		}
		if !enabled {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Environment is disabled"}})
			c.Abort()
			return
		}

		// Build target: map incoming /api/environments/:id/... -> remoteApiUrl/api/environments/<localID>/...
		prefix := "/api/environments/" + envID
		suffix := strings.TrimPrefix(c.Request.URL.Path, prefix)
		if !strings.HasPrefix(suffix, "/") && suffix != "" {
			suffix = "/" + suffix
		}
		target := strings.TrimRight(apiURL, "/") + path.Join("/api/environments/", m.localID) + suffix
		if qs := c.Request.URL.RawQuery; qs != "" {
			target += "?" + qs
		}

		if strings.EqualFold(c.GetHeader("Upgrade"), "websocket") || strings.Contains(strings.ToLower(c.GetHeader("Connection")), "upgrade") {
			m.handleWebSocket(c, target, accessToken, envID)
			return
		}

		m.proxyHTTP(c, target, accessToken)
	}
}

func (m *EnvironmentMiddleware) handleWebSocket(c *gin.Context, target string, accessToken *string, envID string) {
	wsTarget := target
	if strings.HasPrefix(target, "https://") {
		wsTarget = "wss://" + strings.TrimPrefix(target, "https://")
	} else if strings.HasPrefix(target, "http://") {
		wsTarget = "ws://" + strings.TrimPrefix(target, "http://")
	}

	hdr := http.Header{}
	if auth := c.GetHeader("Authorization"); auth != "" {
		hdr.Set("Authorization", auth)
	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
		hdr.Set("Authorization", "Bearer "+cookieToken)
	}

	if hdr.Get("Authorization") == "" {
		if cookieHeader := c.Request.Header.Get("Cookie"); cookieHeader != "" {
			hdr.Set("Cookie", cookieHeader)
		}
	}

	if accessToken != nil && *accessToken != "" {
		hdr.Set("X-Arcane-Agent-Token", *accessToken)
	}

	if err := wsutil.ProxyHTTP(c.Writer, c.Request, wsTarget, hdr); err != nil {
		slog.Error("websocket proxy failed", "env_id", envID, "target", wsTarget, "err", err)
	}
	c.Abort()
}

func (m *EnvironmentMiddleware) proxyHTTP(c *gin.Context, target string, accessToken *string) {
	var bodyReader io.Reader
	if c.Request.Body != nil {
		bodyReader = c.Request.Body
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, target, bodyReader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to create proxy request"}})
		c.Abort()
		return
	}

	skip := map[string]struct{}{
		"Host": {}, "Connection": {}, "Keep-Alive": {}, "Proxy-Authenticate": {},
		"Proxy-Authorization": {}, "Te": {}, "Trailer": {}, "Transfer-Encoding": {},
		"Upgrade": {}, "Content-Length": {}, "Origin": {}, "Referer": {},
		"Access-Control-Request-Method": {}, "Access-Control-Request-Headers": {}, "Cookie": {},
	}
	for k, vs := range c.Request.Header {
		ck := http.CanonicalHeaderKey(k)
		if _, ok := skip[ck]; ok || ck == "Authorization" {
			continue
		}
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}

	if auth := c.GetHeader("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
		req.Header.Set("Authorization", "Bearer "+cookieToken)
	}

	if accessToken != nil && *accessToken != "" {
		req.Header.Set("X-Arcane-Agent-Token", *accessToken)
	}

	req.Header.Set("X-Forwarded-For", c.ClientIP())
	req.Header.Set("X-Forwarded-Host", c.Request.Host)

	needsCredentials := strings.Contains(target, "/image-updates/check") ||
		strings.Contains(target, "/images/pull")

	if needsCredentials && req.Method == http.MethodPost && m.envService != nil {
		if err := m.injectRegistryCredentials(c, req); err != nil {
			slog.WarnContext(c.Request.Context(), "Failed to inject registry credentials",
				slog.String("error", err.Error()),
				slog.String("target", target))
		}
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": fmt.Sprintf("Proxy request failed: %v", err)}})
		c.Abort()
		return
	}
	defer resp.Body.Close()

	hop := map[string]struct{}{
		http.CanonicalHeaderKey("Connection"): {}, http.CanonicalHeaderKey("Keep-Alive"): {},
		http.CanonicalHeaderKey("Proxy-Authenticate"): {}, http.CanonicalHeaderKey("Proxy-Authorization"): {},
		http.CanonicalHeaderKey("TE"): {}, http.CanonicalHeaderKey("Trailers"): {},
		http.CanonicalHeaderKey("Trailer"): {}, http.CanonicalHeaderKey("Transfer-Encoding"): {},
		http.CanonicalHeaderKey("Upgrade"): {},
	}
	for _, connVal := range resp.Header.Values("Connection") {
		for _, token := range strings.Split(connVal, ",") {
			if t := strings.TrimSpace(token); t != "" {
				hop[http.CanonicalHeaderKey(t)] = struct{}{}
			}
		}
	}

	for k, vs := range resp.Header {
		ck := http.CanonicalHeaderKey(k)
		if _, ok := hop[ck]; ok {
			continue
		}
		for _, v := range vs {
			c.Writer.Header().Add(k, v)
		}
	}

	c.Status(resp.StatusCode)
	if c.Request.Method != http.MethodHead {
		_, _ = io.Copy(c.Writer, resp.Body)
	}

	c.Abort()
}

func (m *EnvironmentMiddleware) injectRegistryCredentials(c *gin.Context, req *http.Request) error {
	if m.envService == nil {
		return nil
	}

	if req.Method != http.MethodPost {
		return nil
	}

	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		return fmt.Errorf("failed to read request body: %w", err)
	}
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var pullReq dto.ImagePullDto
	if err := json.Unmarshal(bodyBytes, &pullReq); err != nil {
		var batchReq dto.BatchImageUpdateRequest
		if err := json.Unmarshal(bodyBytes, &batchReq); err != nil {
			req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			return nil
		}

		if len(batchReq.Credentials) > 0 {
			return nil
		}

		creds, err := m.envService.GetEnabledRegistryCredentials(c.Request.Context())
		if err != nil {
			return fmt.Errorf("failed to load registry credentials: %w", err)
		}

		if len(creds) > 0 {
			batchReq.Credentials = creds
			modifiedBody, err := json.Marshal(batchReq)
			if err != nil {
				return fmt.Errorf("failed to marshal modified request: %w", err)
			}

			req.Body = io.NopCloser(bytes.NewBuffer(modifiedBody))
			req.ContentLength = int64(len(modifiedBody))
			req.Header.Set("Content-Length", strconv.Itoa(len(modifiedBody)))

			slog.DebugContext(c.Request.Context(), "Injected registry credentials into batch update request",
				slog.Int("credentialCount", len(creds)))
		}
		return nil
	}

	if len(pullReq.Credentials) > 0 {
		return nil
	}

	creds, err := m.envService.GetEnabledRegistryCredentials(c.Request.Context())
	if err != nil {
		return fmt.Errorf("failed to load registry credentials: %w", err)
	}

	if len(creds) > 0 {
		pullReq.Credentials = creds
		modifiedBody, err := json.Marshal(pullReq)
		if err != nil {
			return fmt.Errorf("failed to marshal modified request: %w", err)
		}

		req.Body = io.NopCloser(bytes.NewBuffer(modifiedBody))
		req.ContentLength = int64(len(modifiedBody))
		req.Header.Set("Content-Length", strconv.Itoa(len(modifiedBody)))

		slog.DebugContext(c.Request.Context(), "Injected registry credentials into image pull request",
			slog.Int("credentialCount", len(creds)),
			slog.String("imageName", pullReq.ImageName))
	}

	return nil
}
