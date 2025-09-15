package registry

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// buildAuthHeader constructs a proper Authorization header value from a token.
// If token already has a scheme (Bearer/Basic), it's used as-is. Otherwise, Bearer is assumed.
func buildAuthHeader(token string) string {
	t := strings.TrimSpace(token)
	if t == "" {
		return ""
	}
	lower := strings.ToLower(t)
	if strings.HasPrefix(lower, "bearer ") || strings.HasPrefix(lower, "basic ") {
		return t
	}
	return "Bearer " + t
}

// getHeaderCI returns the first header value for the given key, case-insensitively.
func getHeaderCI(h http.Header, key string) string {
	for k, v := range h {
		if strings.EqualFold(k, key) && len(v) > 0 {
			return v[0]
		}
	}
	return ""
}

func (c *Client) GetLatestDigest(ctx context.Context, registry, repository, tag, token string) (string, error) {
	url := fmt.Sprintf("%s/v2/%s/manifests/%s", c.GetRegistryURL(registry), repository, tag)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Add("Accept", "application/vnd.docker.distribution.manifest.v2+json")
	req.Header.Add("Accept", "application/vnd.docker.distribution.manifest.list.v2+json")
	req.Header.Add("Accept", "application/vnd.docker.distribution.manifest.v1+json")
	req.Header.Add("Accept", "application/vnd.oci.image.index.v1+json")
	req.Header.Add("Accept", "application/vnd.oci.image.manifest.v1+json")
	req.Header.Set("User-Agent", "Arcane")

	if ah := buildAuthHeader(token); ah != "" {
		req.Header.Set("Authorization", ah)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		h := getHeaderCI(resp.Header, "WWW-Authenticate")
		if h != "" {
			return "", fmt.Errorf("unauthorized: %s", h)
		}
		return "", fmt.Errorf("manifest request failed with status: 401")
	}
	if resp.StatusCode != http.StatusOK {
		www := getHeaderCI(resp.Header, "WWW-Authenticate")
		if www == "" {
			www = "not present"
		}
		return "", fmt.Errorf("manifest request failed with status: %d, auth: %q", resp.StatusCode, www)
	}

	d := getHeaderCI(resp.Header, ContentDigestHeader)
	if d == "" {
		etag := getHeaderCI(resp.Header, "ETag")
		if etag != "" {
			etag = strings.Trim(etag, `"`)
			if strings.HasPrefix(etag, "sha256:") {
				d = etag
			}
		}
	}
	if d == "" {
		return "", fmt.Errorf("no digest header found in response")
	}
	return d, nil
}

func (c *Client) GetLatestDigestTimed(ctx context.Context, registry, repository, tag, token string) (string, time.Duration, error) {
	start := time.Now()
	d, err := c.GetLatestDigest(ctx, registry, repository, tag, token)
	return d, time.Since(start), err
}
