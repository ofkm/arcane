package registry

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (c *Client) GetLatestDigest(ctx context.Context, registry, repository, tag, token string) (string, error) {
	url := fmt.Sprintf("%s/v2/%s/manifests/%s", c.GetRegistryURL(registry), repository, tag)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept",
		"application/vnd.docker.distribution.manifest.list.v2+json, "+
			"application/vnd.docker.distribution.manifest.v2+json, "+
			"application/vnd.oci.image.index.v1+json, "+
			"application/vnd.oci.image.manifest.v1+json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
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
			return "", fmt.Errorf("unauthorized: %s", h)
		}
		return "", fmt.Errorf("manifest request failed with status: 401")
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("manifest request failed with status: %d", resp.StatusCode)
	}

	d := resp.Header.Get("Docker-Content-Digest")
	if d == "" {
		d = resp.Header.Get("docker-content-digest")
	}
	if d == "" {
		etag := resp.Header.Get("Etag")
		if etag != "" && strings.HasPrefix(etag, "sha256:") {
			d = strings.Trim(etag, `"`)
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
