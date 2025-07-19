package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const DEFAULT_REGISTRY = "registry-1.docker.io"

type RegistryUtils struct{}

type RegistryCredentials struct {
	Username string
	Token    string
}

type RegistryTestResult struct {
	OverallSuccess bool      `json:"overall_success"`
	PingSuccess    bool      `json:"ping_success"`
	AuthSuccess    bool      `json:"auth_success"`
	CatalogSuccess bool      `json:"catalog_success"`
	URL            string    `json:"url"`
	Domain         string    `json:"domain"`
	Timestamp      time.Time `json:"timestamp"`
	Errors         []string  `json:"errors"`
}

func NewRegistryUtils() *RegistryUtils {
	return &RegistryUtils{}
}

func (r *RegistryUtils) SplitImageReference(reference string) (string, string, string, error) {
	if reference == "" {
		return "", "", "", fmt.Errorf("empty reference provided")
	}

	splits := strings.Split(reference, "/")
	var registry, repositoryAndTag string

	switch len(splits) {
	case 1:
		registry = DEFAULT_REGISTRY
		repositoryAndTag = reference
	default:
		if splits[0] == "docker.io" {
			registry = DEFAULT_REGISTRY
			repositoryAndTag = strings.Join(splits[1:], "/")
		} else if splits[0] == "localhost" || strings.Contains(splits[0], ".") || strings.Contains(splits[0], ":") {
			registry = splits[0]
			repositoryAndTag = strings.Join(splits[1:], "/")
		} else {
			registry = DEFAULT_REGISTRY
			repositoryAndTag = reference
		}
	}

	repositoryAndTag = strings.Split(repositoryAndTag, "@")[0]

	tagSplits := strings.Split(repositoryAndTag, ":")
	var repository, tag string

	switch len(tagSplits) {
	case 1:
		repository = tagSplits[0]
		tag = "latest"
	case 2:
		repository = tagSplits[0]
		tag = tagSplits[1]
	default:
		return "", "", "", fmt.Errorf("invalid reference format: too many colons in %s", repositoryAndTag)
	}

	repositoryComponents := strings.Split(repository, "/")
	if len(repositoryComponents) == 1 && registry == DEFAULT_REGISTRY {
		repository = "library/" + repository
	}

	return registry, repository, tag, nil
}

func (r *RegistryUtils) GetRegistryURL(registry string) string {
	switch registry {
	case DEFAULT_REGISTRY, "docker.io":
		return "https://index.docker.io"
	default:
		if !strings.HasPrefix(registry, "http") {
			return "https://" + registry
		}
		return registry
	}
}

func (r *RegistryUtils) CheckAuth(ctx context.Context, registry string) (string, error) {
	url := fmt.Sprintf("%s/v2/", r.GetRegistryURL(registry))

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		authHeader := resp.Header.Get("WWW-Authenticate")
		if authHeader != "" {
			authURL := r.parseWWWAuthenticate(authHeader)
			return authURL, nil
		}
	}

	return "", nil
}

func (r *RegistryUtils) parseWWWAuthenticate(header string) string {
	if strings.HasPrefix(header, "Bearer ") {
		parts := strings.Split(header[7:], ",")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if strings.HasPrefix(part, "realm=") {
				realm := strings.Trim(part[6:], `"`)
				return realm
			}
		}
	}
	return ""
}

func (r *RegistryUtils) getServiceName(authURL string) string {
	if strings.Contains(authURL, "auth.docker.io") {
		return "registry.docker.io"
	}

	urlParts := strings.Split(strings.TrimPrefix(authURL, "https://"), "/")
	if len(urlParts) > 0 {
		return urlParts[0]
	}
	return "registry"
}

func (r *RegistryUtils) GetToken(ctx context.Context, authURL, repository string, credentials *RegistryCredentials) (string, error) {
	serviceName := r.getServiceName(authURL)
	tokenURL := fmt.Sprintf("%s?service=%s&scope=repository:%s:pull", authURL, serviceName, repository)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tokenURL, nil)
	if err != nil {
		return "", err
	}

	if credentials != nil && credentials.Username != "" && credentials.Token != "" {
		req.SetBasicAuth(credentials.Username, credentials.Token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed with status: %d", resp.StatusCode)
	}

	var tokenResp struct {
		Token string `json:"token"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	return tokenResp.Token, nil
}

func (r *RegistryUtils) GetLatestDigest(ctx context.Context, registry, repository, tag string, token string) (string, error) {
	url := fmt.Sprintf("%s/v2/%s/manifests/%s", r.GetRegistryURL(registry), repository, tag)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json")

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("manifest request failed with status: %d", resp.StatusCode)
	}

	digest := resp.Header.Get("Docker-Content-Digest")
	if digest == "" {
		digest = resp.Header.Get("docker-content-digest")
	}
	if digest == "" {
		etag := resp.Header.Get("Etag")
		if etag != "" && strings.HasPrefix(etag, "sha256:") {
			digest = strings.Trim(etag, `"`)
		}
	}

	if digest == "" {
		return "", fmt.Errorf("no digest header found in response")
	}

	return digest, nil
}

func (r *RegistryUtils) GetImageTags(ctx context.Context, registry, repository string, token string) ([]string, error) {
	url := fmt.Sprintf("%s/v2/%s/tags/list", r.GetRegistryURL(registry), repository)

	var allTags []string
	nextURL := url

	for nextURL != "" {
		client := &http.Client{Timeout: 30 * time.Second}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, nextURL, nil)
		if err != nil {
			return nil, err
		}

		req.Header.Set("Accept", "application/json")

		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("tags request failed with status: %d", resp.StatusCode)
		}

		var tagsResp struct {
			Tags []string `json:"tags"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tagsResp); err != nil {
			return nil, err
		}

		allTags = append(allTags, tagsResp.Tags...)

		linkHeader := resp.Header.Get("Link")
		nextURL = r.parseLinkHeader(linkHeader, url)
	}

	return allTags, nil
}

func (r *RegistryUtils) parseLinkHeader(linkHeader, baseURL string) string {
	if linkHeader == "" {
		return ""
	}

	parts := strings.Split(linkHeader, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.Contains(part, `rel="next"`) {
			start := strings.Index(part, "<")
			end := strings.Index(part, ">")
			if start != -1 && end != -1 && end > start {
				return part[start+1 : end]
			}
		}
	}

	return ""
}

func TestRegistryConnection(ctx context.Context, registryURL string, credentials *RegistryCredentials) (*RegistryTestResult, error) {
	registryUtils := NewRegistryUtils()

	result := &RegistryTestResult{
		URL:       registryURL,
		Domain:    registryURL,
		Timestamp: time.Now(),
		Errors:    []string{},
	}

	registry := strings.TrimPrefix(strings.TrimPrefix(registryURL, "https://"), "http://")
	if registry == "docker.io" {
		registry = DEFAULT_REGISTRY
	}

	authURL, err := registryUtils.CheckAuth(ctx, registry)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Ping failed: %v", err))
		result.PingSuccess = false
	} else {
		result.PingSuccess = true
	}

	if authURL != "" && credentials != nil {
		token, err := registryUtils.GetToken(ctx, authURL, "library/hello-world", credentials)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Auth failed: %v", err))
			result.AuthSuccess = false
		} else {
			result.AuthSuccess = token != ""
		}
	} else {
		result.AuthSuccess = authURL == ""
	}

	tags, err := registryUtils.GetImageTags(ctx, registry, "library/hello-world", "")
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Catalog access failed: %v", err))
		result.CatalogSuccess = false
	} else {
		result.CatalogSuccess = len(tags) > 0
	}

	result.OverallSuccess = result.PingSuccess && result.AuthSuccess && result.CatalogSuccess

	return result, nil
}

func ExtractRegistryDomain(imageRef string) (string, error) {
	registryUtils := NewRegistryUtils()
	registry, _, _, err := registryUtils.SplitImageReference(imageRef)
	if err != nil {
		return "", fmt.Errorf("failed to extract registry domain: %w", err)
	}

	if registry == DEFAULT_REGISTRY {
		return "docker.io", nil
	}

	return registry, nil
}
