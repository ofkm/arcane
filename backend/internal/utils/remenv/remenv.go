package remenv

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
)

type CredentialInjector interface {
	GetEnabledRegistryCredentials(ctx context.Context) ([]dto.ContainerRegistryCredential, error)
}

func CopyRequestHeaders(from http.Header, to http.Header, skip map[string]struct{}) {
	for k, vs := range from {
		ck := http.CanonicalHeaderKey(k)
		if _, ok := skip[ck]; ok || ck == "Authorization" {
			continue
		}
		for _, v := range vs {
			to.Add(k, v)
		}
	}
}

func SetAuthHeader(req *http.Request, c *gin.Context) {
	if auth := c.GetHeader("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
		req.Header.Set("Authorization", "Bearer "+cookieToken)
	}
}

func SetAgentToken(req *http.Request, accessToken *string) {
	if accessToken != nil && *accessToken != "" {
		req.Header.Set("X-Arcane-Agent-Token", *accessToken)
	}
}

func SetForwardedHeaders(req *http.Request, clientIP, host string) {
	req.Header.Set("X-Forwarded-For", clientIP)
	req.Header.Set("X-Forwarded-Host", host)
}

func GetHopByHopHeaders() map[string]struct{} {
	return map[string]struct{}{
		http.CanonicalHeaderKey("Connection"):          {},
		http.CanonicalHeaderKey("Keep-Alive"):          {},
		http.CanonicalHeaderKey("Proxy-Authenticate"):  {},
		http.CanonicalHeaderKey("Proxy-Authorization"): {},
		http.CanonicalHeaderKey("TE"):                  {},
		http.CanonicalHeaderKey("Trailers"):            {},
		http.CanonicalHeaderKey("Trailer"):             {},
		http.CanonicalHeaderKey("Transfer-Encoding"):   {},
		http.CanonicalHeaderKey("Upgrade"):             {},
	}
}

func BuildHopByHopHeaders(respHeader http.Header) map[string]struct{} {
	hop := GetHopByHopHeaders()

	for _, connVal := range respHeader.Values("Connection") {
		for _, token := range strings.Split(connVal, ",") {
			if t := strings.TrimSpace(token); t != "" {
				hop[http.CanonicalHeaderKey(t)] = struct{}{}
			}
		}
	}

	return hop
}

func CopyResponseHeaders(from http.Header, to http.Header, hop map[string]struct{}) {
	for k, vs := range from {
		ck := http.CanonicalHeaderKey(k)
		if _, ok := hop[ck]; ok {
			continue
		}
		for _, v := range vs {
			to.Add(k, v)
		}
	}
}

func NeedsCredentialInjection(target string) bool {
	return strings.Contains(target, "/image-updates/check") ||
		strings.Contains(target, "/images/pull")
}

func InjectRegistryCredentials(ctx context.Context, req *http.Request, injector CredentialInjector) error {
	if injector == nil || req.Method != http.MethodPost {
		return nil
	}

	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		return fmt.Errorf("failed to read request body: %w", err)
	}
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var pullReq dto.ImagePullDto
	if err := json.Unmarshal(bodyBytes, &pullReq); err != nil {
		return injectBatchUpdateCredentials(ctx, bodyBytes, req, injector)
	}

	return injectImagePullCredentials(ctx, pullReq, req, injector)
}

func injectBatchUpdateCredentials(ctx context.Context, bodyBytes []byte, req *http.Request, injector CredentialInjector) error {
	var batchReq dto.BatchImageUpdateRequest

	if err := json.Unmarshal(bodyBytes, &batchReq); err != nil {
		return nil //nolint:nilerr
	}

	if len(batchReq.Credentials) > 0 {
		return nil
	}

	creds, err := injector.GetEnabledRegistryCredentials(ctx)
	if err != nil {
		return fmt.Errorf("failed to load registry credentials: %w", err)
	}

	if len(creds) == 0 {
		return nil
	}

	batchReq.Credentials = creds
	modifiedBody, err := json.Marshal(batchReq)
	if err != nil {
		return fmt.Errorf("failed to marshal modified request: %w", err)
	}

	updateRequestBody(req, modifiedBody)
	slog.DebugContext(ctx, "Injected registry credentials into batch update request",
		slog.Int("credentialCount", len(creds)))

	return nil
}

func injectImagePullCredentials(ctx context.Context, pullReq dto.ImagePullDto, req *http.Request, injector CredentialInjector) error {
	if len(pullReq.Credentials) > 0 {
		return nil
	}

	creds, err := injector.GetEnabledRegistryCredentials(ctx)
	if err != nil {
		return err
	}

	if len(creds) == 0 {
		return nil
	}

	pullReq.Credentials = creds
	modifiedBody, err := json.Marshal(pullReq)
	if err != nil {
		return fmt.Errorf("failed to marshal modified request: %w", err)
	}

	updateRequestBody(req, modifiedBody)
	slog.DebugContext(ctx, "Injected registry credentials into image pull request",
		slog.Int("credentialCount", len(creds)),
		slog.String("imageName", pullReq.ImageName))

	return nil
}

func updateRequestBody(req *http.Request, body []byte) {
	req.Body = io.NopCloser(bytes.NewBuffer(body))
	req.ContentLength = int64(len(body))
	req.Header.Set("Content-Length", strconv.Itoa(len(body)))
}

func GetSkipHeaders() map[string]struct{} {
	return map[string]struct{}{
		"Host": {}, "Connection": {}, "Keep-Alive": {}, "Proxy-Authenticate": {},
		"Proxy-Authorization": {}, "Te": {}, "Trailer": {}, "Transfer-Encoding": {},
		"Upgrade": {}, "Content-Length": {}, "Origin": {}, "Referer": {},
		"Access-Control-Request-Method": {}, "Access-Control-Request-Headers": {}, "Cookie": {},
	}
}
