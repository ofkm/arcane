package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ofkm/arcane-backend/internal/utils/cache"
)

const (
	registryCheckTimeout = 10 * time.Second
	registryCacheTTL     = 30 * time.Minute
)

// RegistryService handles Docker registry API interactions for checking image digests
type RegistryService struct {
	httpClient *http.Client
	cache      map[string]*cache.Cache[string] // imageRef -> cache
	cacheMu    sync.RWMutex
}

// ImageDigestInfo contains information about an image's digest from the registry
type ImageDigestInfo struct {
	Digest     string
	Repository string
	Tag        string
}

func NewRegistryService(httpClient *http.Client) *RegistryService {
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: registryCheckTimeout,
		}
	}
	return &RegistryService{
		httpClient: httpClient,
		cache:      make(map[string]*cache.Cache[string]),
	}
}

// GetImageDigest fetches the current digest for an image:tag from the registry
func (s *RegistryService) GetImageDigest(ctx context.Context, imageRef string) (*ImageDigestInfo, error) {
	repository, tag := parseImageReference(imageRef)
	if repository == "" || tag == "" {
		return nil, fmt.Errorf("invalid image reference: %s", imageRef)
	}

	// Build a cache key from the full image reference
	cacheKey := fmt.Sprintf("%s:%s", repository, tag)

	// Get or create a cache for this specific image reference
	s.cacheMu.RLock()
	imageCache, exists := s.cache[cacheKey]
	s.cacheMu.RUnlock()

	if !exists {
		s.cacheMu.Lock()
		// Double-check after acquiring write lock
		if imageCache, exists = s.cache[cacheKey]; !exists {
			imageCache = cache.New[string](registryCacheTTL)
			s.cache[cacheKey] = imageCache
		}
		s.cacheMu.Unlock()
	}

	digest, err := imageCache.GetOrFetch(ctx, func(ctx context.Context) (string, error) {
		return s.fetchDigestFromRegistry(ctx, repository, tag)
	})

	var staleErr *cache.ErrStale
	if err != nil && !errors.As(err, &staleErr) {
		return nil, err
	}

	return &ImageDigestInfo{
		Digest:     digest,
		Repository: repository,
		Tag:        tag,
	}, nil
}

// fetchDigestFromRegistry queries the Docker registry API for the image digest
func (s *RegistryService) fetchDigestFromRegistry(ctx context.Context, repository, tag string) (string, error) {
	// Determine registry URL and API endpoint
	registryURL, repoPath := parseRegistryAndRepo(repository)

	// Build manifest URL
	manifestURL := fmt.Sprintf("%s/v2/%s/manifests/%s", registryURL, repoPath, tag)

	slog.DebugContext(ctx, "Fetching image digest from registry",
		"url", manifestURL,
		"repository", repository,
		"tag", tag,
	)

	reqCtx, cancel := context.WithTimeout(ctx, registryCheckTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodHead, manifestURL, nil)
	if err != nil {
		return "", fmt.Errorf("create registry request: %w", err)
	}

	// Set Accept headers for Docker registry API v2
	// Request both manifest schema v2 and OCI image manifest
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("registry request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		// Try with authentication if we get 401
		return s.fetchDigestWithAuth(ctx, repository, tag, resp.Header.Get("Www-Authenticate"))
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("registry returned status %d", resp.StatusCode)
	}

	// Get digest from Docker-Content-Digest header
	digest := resp.Header.Get("Docker-Content-Digest")
	if digest == "" {
		// Fallback: try Etag header (some registries use this)
		digest = strings.Trim(resp.Header.Get("Etag"), "\"")
	}

	if digest == "" {
		return "", fmt.Errorf("no digest found in registry response")
	}

	slog.DebugContext(ctx, "Successfully fetched image digest",
		"repository", repository,
		"tag", tag,
		"digest", digest,
	)

	return digest, nil
}

// fetchDigestWithAuth handles authentication for private registries
func (s *RegistryService) fetchDigestWithAuth(ctx context.Context, repository, tag, wwwAuthenticate string) (string, error) {
	// Parse WWW-Authenticate header to get auth endpoint and parameters
	authParams := parseWWWAuthenticate(wwwAuthenticate)
	if authParams.Realm == "" {
		return "", fmt.Errorf("no auth realm found")
	}

	// For public registries like ghcr.io, we can get an anonymous token
	tokenURL := fmt.Sprintf("%s?service=%s&scope=repository:%s:pull",
		authParams.Realm,
		authParams.Service,
		strings.TrimPrefix(repository, authParams.Registry+"/"),
	)

	slog.DebugContext(ctx, "Fetching registry auth token", "url", tokenURL)

	reqCtx, cancel := context.WithTimeout(ctx, registryCheckTimeout)
	defer cancel()

	tokenReq, err := http.NewRequestWithContext(reqCtx, http.MethodGet, tokenURL, nil)
	if err != nil {
		return "", fmt.Errorf("create token request: %w", err)
	}

	tokenResp, err := s.httpClient.Do(tokenReq)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer tokenResp.Body.Close()

	if tokenResp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request returned status %d", tokenResp.StatusCode)
	}

	var tokenData struct {
		Token       string `json:"token"`
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokenData); err != nil {
		return "", fmt.Errorf("decode token response: %w", err)
	}

	token := tokenData.Token
	if token == "" {
		token = tokenData.AccessToken
	}
	if token == "" {
		return "", fmt.Errorf("no token in response")
	}

	// Retry the original request with the token
	registryURL, repoPath := parseRegistryAndRepo(repository)
	manifestURL := fmt.Sprintf("%s/v2/%s/manifests/%s", registryURL, repoPath, tag)

	reqCtx2, cancel2 := context.WithTimeout(ctx, registryCheckTimeout)
	defer cancel2()

	req, err := http.NewRequestWithContext(reqCtx2, http.MethodHead, manifestURL, nil)
	if err != nil {
		return "", fmt.Errorf("create authenticated request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("authenticated request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("authenticated request returned status %d", resp.StatusCode)
	}

	digest := resp.Header.Get("Docker-Content-Digest")
	if digest == "" {
		digest = strings.Trim(resp.Header.Get("Etag"), "\"")
	}

	if digest == "" {
		return "", fmt.Errorf("no digest found in authenticated response")
	}

	return digest, nil
}

// parseImageReference splits an image reference into repository and tag
// Examples:
//   - "ghcr.io/getarcaneapp/arcane:latest" -> ("ghcr.io/getarcaneapp/arcane", "latest")
//   - "ghcr.io/getarcaneapp/arcane:next" -> ("ghcr.io/getarcaneapp/arcane", "next")
func parseImageReference(imageRef string) (repository, tag string) {
	// Remove any digest if present
	if idx := strings.Index(imageRef, "@"); idx != -1 {
		imageRef = imageRef[:idx]
	}

	// Find the last colon (after the last slash) to separate tag
	lastSlash := strings.LastIndex(imageRef, "/")
	lastColon := strings.LastIndex(imageRef, ":")

	if lastColon > lastSlash && lastColon != -1 {
		repository = imageRef[:lastColon]
		tag = imageRef[lastColon+1:]
	} else {
		repository = imageRef
		tag = "latest"
	}

	return repository, tag
}

// parseRegistryAndRepo splits a repository into registry URL and repo path
// Examples:
//   - "ghcr.io/getarcaneapp/arcane" -> ("https://ghcr.io", "getarcaneapp/arcane")
//   - "docker.io/library/nginx" -> ("https://registry-1.docker.io", "library/nginx")
func parseRegistryAndRepo(repository string) (registryURL, repoPath string) {
	parts := strings.SplitN(repository, "/", 2)

	if len(parts) == 1 {
		// No registry specified, assume Docker Hub
		return "https://registry-1.docker.io", "library/" + parts[0]
	}

	registry := parts[0]
	repoPath = parts[1]

	// Handle special cases
	switch registry {
	case "docker.io":
		registryURL = "https://registry-1.docker.io"
	case "ghcr.io":
		registryURL = "https://ghcr.io"
	case "gcr.io":
		registryURL = "https://gcr.io"
	case "quay.io":
		registryURL = "https://quay.io"
	default:
		// Check if it looks like a domain
		if strings.Contains(registry, ".") || strings.Contains(registry, ":") {
			registryURL = "https://" + registry
		} else {
			// Assume Docker Hub if no dots in registry name
			registryURL = "https://registry-1.docker.io"
			repoPath = repository
		}
	}

	return registryURL, repoPath
}

// AuthParams contains parsed WWW-Authenticate header information
type AuthParams struct {
	Realm    string
	Service  string
	Registry string
}

// parseWWWAuthenticate parses the WWW-Authenticate header
// Example: Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:user/image:pull"
func parseWWWAuthenticate(header string) AuthParams {
	params := AuthParams{}

	if !strings.HasPrefix(header, "Bearer ") {
		return params
	}

	header = strings.TrimPrefix(header, "Bearer ")
	parts := strings.Split(header, ",")

	for _, part := range parts {
		part = strings.TrimSpace(part)
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}

		key := strings.TrimSpace(kv[0])
		value := strings.Trim(strings.TrimSpace(kv[1]), "\"")

		switch key {
		case "realm":
			params.Realm = value
		case "service":
			params.Service = value
			// Extract registry from service if it looks like a domain
			if strings.Contains(value, ".") {
				params.Registry = value
			}
		}
	}

	return params
}
