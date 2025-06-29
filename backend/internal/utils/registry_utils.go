package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type DockerHubTokenResponse struct {
	Token     string `json:"token"`
	ExpiresIn int    `json:"expires_in"`
	IssuedAt  string `json:"issued_at"`
}

type DockerHubTagsResponse struct {
	Name string `json:"name"`
	Tags []struct {
		Name        string    `json:"name"`
		FullSize    int       `json:"full_size"`
		LastUpdated time.Time `json:"last_updated"`
	} `json:"tags"`
}

type RegistryCredentials struct {
	Username string
	Token    string
}

func BuildRegistryURL(domain string) string {
	switch domain {
	case "docker.io", "index.docker.io", "":
		return "https://registry-1.docker.io/v2"
	case "gcr.io":
		return "https://gcr.io/v2"
	case "ghcr.io":
		return "https://ghcr.io/v2"
	case "quay.io":
		return "https://quay.io/v2"
	default:
		if strings.HasPrefix(domain, "http://") || strings.HasPrefix(domain, "https://") {
			return domain + "/v2"
		}
		// Default to HTTPS for custom domains
		return "https://" + domain + "/v2"
	}
}

// GetRegistryToken gets an authentication token for the specified registry
func GetRegistryToken(ctx context.Context, domain, repo string, creds *RegistryCredentials) (string, error) {
	switch domain {
	case "docker.io", "index.docker.io", "registry-1.docker.io":
		return getDockerHubToken(ctx, repo, creds)
	case "gcr.io":
		return getGCRToken(ctx, repo, creds)
	case "ghcr.io":
		return getGHCRToken(ctx, repo, creds)
	case "quay.io":
		return getQuayToken(ctx, repo, creds)
	default:
		return getGenericRegistryToken(ctx, domain, repo, creds)
	}
}

func getGenericRegistryToken(ctx context.Context, domain, repo string, creds *RegistryCredentials) (string, error) {
	authURL := fmt.Sprintf("https://%s/v2/", domain)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, authURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create auth request: %w", err)
	}

	if creds != nil && creds.Username != "" {
		req.SetBasicAuth(creds.Username, creds.Token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to authenticate: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return "", nil
	}

	if resp.StatusCode != http.StatusUnauthorized {
		return "", fmt.Errorf("unexpected auth response: %d", resp.StatusCode)
	}

	authHeader := resp.Header.Get("Www-Authenticate")
	if authHeader == "" {
		return "", fmt.Errorf("no auth challenge")
	}

	return parseAndGetToken(ctx, authHeader, creds)
}

// getDockerHubToken gets a token for Docker Hub
func getDockerHubToken(ctx context.Context, repo string, creds *RegistryCredentials) (string, error) {
	normalizedRepo := repo
	if !strings.Contains(repo, "/") {
		normalizedRepo = "library/" + repo
	} else if strings.HasPrefix(repo, "docker.io/") {
		normalizedRepo = strings.TrimPrefix(repo, "docker.io/")
	}

	authURL := fmt.Sprintf("https://auth.docker.io/token?service=registry.docker.io&scope=repository:%s:pull", normalizedRepo)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, authURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create auth request: %w", err)
	}

	// Add credentials if provided
	if creds != nil && creds.Username != "" && creds.Token != "" {
		req.SetBasicAuth(creds.Username, creds.Token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get auth token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("auth request failed with status: %d", resp.StatusCode)
	}

	var tokenResp DockerHubTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode auth response: %w", err)
	}

	return tokenResp.Token, nil
}

// getGCRToken gets a token for Google Container Registry
func getGCRToken(ctx context.Context, repo string, creds *RegistryCredentials) (string, error) {
	return getGenericRegistryToken(ctx, "gcr.io", repo, creds)
}

// getGitHubRegistryToken gets a token for GitHub Container Registry
func getGHCRToken(ctx context.Context, repo string, creds *RegistryCredentials) (string, error) {
	return getGenericRegistryToken(ctx, "ghcr.io", repo, creds)
}

// getQuayToken gets a token for Quay.io
func getQuayToken(ctx context.Context, repo string, creds *RegistryCredentials) (string, error) {
	return getGenericRegistryToken(ctx, "quay.io", repo, creds)
}

func parseAndGetToken(ctx context.Context, authHeader string, creds *RegistryCredentials) (string, error) {
	return "", fmt.Errorf("token parsing not implemented")
}

// TestRegistryConnection tests connectivity to a registry with credentials
func TestRegistryConnection(ctx context.Context, domain string, creds *RegistryCredentials) (*RegistryTestResult, error) {
	registryURL := BuildRegistryURL(domain)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	result := &RegistryTestResult{
		Domain:    domain,
		URL:       registryURL,
		Timestamp: time.Now().UTC(),
	}

	// Test 1: Ping test
	pingErr := testPing(ctx, client, registryURL, creds)
	result.PingSuccess = pingErr == nil
	if pingErr != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Ping failed: %s", pingErr.Error()))
	}

	// Test 2: Auth test
	authErr := testAuth(ctx, client, registryURL, creds)
	result.AuthSuccess = authErr == nil
	if authErr != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Auth failed: %s", authErr.Error()))
	}

	// Test 3: Catalog test
	catalogErr := testCatalog(ctx, client, registryURL, creds)
	result.CatalogSuccess = catalogErr == nil
	if catalogErr != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Catalog failed: %s", catalogErr.Error()))
	}

	// Determine overall success
	result.OverallSuccess = result.PingSuccess && (result.AuthSuccess || creds == nil)

	return result, nil
}

type RegistryTestResult struct {
	Domain         string    `json:"domain"`
	URL            string    `json:"url"`
	Timestamp      time.Time `json:"timestamp"`
	OverallSuccess bool      `json:"overall_success"`
	PingSuccess    bool      `json:"ping_success"`
	AuthSuccess    bool      `json:"auth_success"`
	CatalogSuccess bool      `json:"catalog_success"`
	Errors         []string  `json:"errors,omitempty"`
}

func testPing(ctx context.Context, client *http.Client, registryURL string, creds *RegistryCredentials) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, registryURL+"/", nil)
	if err != nil {
		return err
	}

	if creds != nil && creds.Username != "" && creds.Token != "" {
		req.SetBasicAuth(creds.Username, creds.Token)
	}

	req.Header.Set("User-Agent", "Arcane-Registry-Test/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Accept 200 (OK) or 401/403 (registry exists but needs auth)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusForbidden {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

func testAuth(ctx context.Context, client *http.Client, registryURL string, creds *RegistryCredentials) error {
	if creds == nil {
		return nil // Skip auth test if no credentials
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, registryURL+"/_catalog?n=1", nil)
	if err != nil {
		return err
	}

	req.SetBasicAuth(creds.Username, creds.Token)
	req.Header.Set("User-Agent", "Arcane-Registry-Test/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return nil
	}

	return fmt.Errorf("authentication failed with status: %d", resp.StatusCode)
}

func testCatalog(ctx context.Context, client *http.Client, registryURL string, creds *RegistryCredentials) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, registryURL+"/_catalog?n=5", nil)
	if err != nil {
		return err
	}

	if creds != nil && creds.Username != "" && creds.Token != "" {
		req.SetBasicAuth(creds.Username, creds.Token)
	}

	req.Header.Set("User-Agent", "Arcane-Registry-Test/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Accept 200 (OK), 401 (needs auth), or 403 (forbidden but accessible)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusForbidden {
		return fmt.Errorf("catalog request failed with status: %d", resp.StatusCode)
	}

	return nil
}

// Legacy functions for backward compatibility
func GetGenericRegistryToken(ctx context.Context, domain, repo string) (string, error) {
	return GetRegistryToken(ctx, domain, repo, nil)
}

func IsPrivateRegistry(repo string) bool {
	domain := ExtractRegistryDomain(repo)

	publicRegistries := []string{
		"docker.io",
		"registry-1.docker.io",
		"index.docker.io",
		"gcr.io",
		"ghcr.io",
		"quay.io",
	}

	for _, publicRegistry := range publicRegistries {
		if domain == publicRegistry {
			return false
		}
	}

	return true
}

func ExtractRegistryDomain(repo string) string {
	// Handle different image name formats:
	// - nginx (Docker Hub official)
	// - user/repo (Docker Hub user)
	// - registry.example.com/user/repo
	// - registry.example.com:5000/user/repo
	// - localhost:5000/user/repo

	if !strings.Contains(repo, "/") {
		// Official Docker Hub image (e.g., "nginx")
		return "docker.io"
	}

	parts := strings.Split(repo, "/")
	firstPart := parts[0]

	// Check if first part looks like a registry domain
	if strings.Contains(firstPart, ".") || strings.Contains(firstPart, ":") || firstPart == "localhost" {
		return firstPart
	}

	// If no domain detected, assume Docker Hub
	return "docker.io"
}

func GetDockerHubToken(ctx context.Context, repo string) (string, error) {
	return getDockerHubToken(ctx, repo, nil)
}
