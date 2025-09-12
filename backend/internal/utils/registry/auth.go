package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type Credentials struct {
	Username string
	Token    string
}

func (c *Client) GetRegistryURL(registry string) string {
	switch registry {
	case DefaultRegistry, "docker.io":
		return "https://index.docker.io"
	default:
		if !strings.HasPrefix(registry, "http") {
			return "https://" + registry
		}
		return registry
	}
}

func (c *Client) getServiceName(authURL string) string {
	if strings.Contains(authURL, "auth.docker.io") {
		return "registry.docker.io"
	}
	parts := strings.Split(strings.TrimPrefix(authURL, "https://"), "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return "registry"
}

func (c *Client) ParseAuthChallenge(header string) (string, string) {
	lower := strings.ToLower(header)
	if !strings.HasPrefix(lower, "bearer ") {
		return "", ""
	}
	idx := strings.Index(header, " ")
	if idx == -1 {
		return "", ""
	}
	raw := header[idx+1:]
	parts := strings.Split(raw, ",")
	var realm, service string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		lp := strings.ToLower(p)
		switch {
		case strings.HasPrefix(lp, "realm="):
			realm = strings.Trim(p[len("realm="):], `"`)
		case strings.HasPrefix(lp, "service="):
			service = strings.Trim(p[len("service="):], `"`)
		}
	}
	return realm, service
}

func (c *Client) CheckAuth(ctx context.Context, registry string) (string, error) {
	url := fmt.Sprintf("%s/v2/", c.GetRegistryURL(registry))
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		h := resp.Header.Get("WWW-Authenticate")
		if h == "" {
			h = resp.Header.Get("Www-Authenticate")
		}
		if h != "" {
			realm, service := c.ParseAuthChallenge(h)
			if realm != "" {
				if service != "" && !strings.Contains(realm, "service=") {
					if strings.Contains(realm, "?") {
						return realm + "&service=" + service, nil
					}
					return realm + "?service=" + service, nil
				}
				return realm, nil
			}
		}
	}
	return "", nil
}

func (c *Client) GetTokenMulti(ctx context.Context, authURL string, repositories []string, creds *Credentials) (string, error) {
	parsed, err := url.Parse(authURL)
	if err != nil {
		return "", fmt.Errorf("invalid auth url: %w", err)
	}
	q := parsed.Query()
	if q.Get("service") == "" {
		q.Set("service", c.getServiceName(authURL))
	}
	for _, repo := range repositories {
		q.Add("scope", fmt.Sprintf("repository:%s:pull", repo))
	}
	parsed.RawQuery = q.Encode()

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return "", err
	}
	if creds != nil && creds.Username != "" && creds.Token != "" {
		req.SetBasicAuth(creds.Username, creds.Token)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed with status: %d", resp.StatusCode)
	}
	var tr struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return "", err
	}
	return tr.Token, nil
}

func (c *Client) GetToken(ctx context.Context, authURL, repository string, creds *Credentials) (string, error) {
	return c.GetTokenMulti(ctx, authURL, []string{repository}, creds)
}

// AcquireTokenViaChallenge:
// Parses a WWW-Authenticate Bearer challenge, builds an auth URL,
// tries anonymous multi-scope token, then credential-based.
// Returns (token, method, username, error)
func AcquireTokenViaChallenge(
	ctx context.Context,
	registryHost string,
	repository string,
	challengeHeader string,
	enabledRegs []models.ContainerRegistry,
) (string, string, string, error) {
	// Normalize challenge to start at Bearer
	ch := strings.TrimSpace(challengeHeader)
	low := strings.ToLower(ch)
	if idx := strings.Index(low, "bearer "); idx >= 0 && idx != 0 {
		ch = ch[idx:]
	}

	// Extract (realm, service)
	c := NewClient()
	realm, service := c.ParseAuthChallenge(ch)
	if realm == "" {
		return "", "", "", fmt.Errorf("invalid challenge")
	}

	authURL := realm
	if service != "" && !strings.Contains(authURL, "service=") {
		if strings.Contains(authURL, "?") {
			authURL += "&service=" + service
		} else {
			authURL += "?service=" + service
		}
	}

	repoNorm := normalizeRepositoryForDockerIO(registryHost, repository)
	scopes := []string{repoNorm}

	// Anonymous attempt
	if tok, err := c.GetTokenMulti(ctx, authURL, scopes, nil); err == nil && tok != "" {
		return tok, "anonymous", "", nil
	}

	// Credential attempts
	hostNorm := normalizeHost(registryHost)
	for _, cr := range enabledRegs {
		if !cr.Enabled || cr.Username == "" || cr.Token == "" {
			continue
		}
		if normalizeHost(cr.URL) != hostNorm {
			continue
		}
		dec, err := utils.Decrypt(cr.Token)
		if err != nil {
			continue
		}
		creds := &Credentials{Username: cr.Username, Token: dec}
		if tok, err := c.GetTokenMulti(ctx, authURL, scopes, creds); err == nil && tok != "" {
			return tok, "credential", cr.Username, nil
		}
	}

	return "", "", "", fmt.Errorf("token acquisition failed")
}

// Helpers (formerly in check.go)

func normalizeHost(u string) string {
	u = strings.TrimSpace(u)
	u = strings.TrimPrefix(u, "https://")
	u = strings.TrimPrefix(u, "http://")
	u = strings.TrimSuffix(u, "/")
	return strings.ToLower(u)
}

func normalizeRepositoryForDockerIO(registryHost, repo string) string {
	r := normalizeHost(registryHost)
	if r == "docker.io" || r == DefaultRegistry || r == "index.docker.io" {
		if !strings.Contains(repo, "/") {
			return "library/" + repo
		}
		if strings.Count(repo, "/") == 0 {
			return "library/" + repo
		}
	}
	return repo
}
