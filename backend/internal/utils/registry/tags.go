package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (c *Client) GetImageTags(ctx context.Context, registry, repository, token string) ([]string, error) {
	url := fmt.Sprintf("%s/v2/%s/tags/list", c.GetRegistryURL(registry), repository)

	var all []string
	next := url
	for next != "" {
		reqCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, next, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, err := c.http.Do(req)
		if err != nil {
			return nil, err
		}
		func() {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusUnauthorized {
				h := resp.Header.Get("WWW-Authenticate")
				if h == "" {
					h = resp.Header.Get("Www-Authenticate")
				}
				if h != "" {
					err = fmt.Errorf("unauthorized: %s", h)
				} else {
					err = fmt.Errorf("tags request failed with status: 401")
				}
				return
			}
			if resp.StatusCode != http.StatusOK {
				err = fmt.Errorf("tags request failed with status: %d", resp.StatusCode)
				return
			}
			var body struct {
				Tags []string `json:"tags"`
			}
			if decErr := json.NewDecoder(resp.Body).Decode(&body); decErr != nil {
				err = decErr
				return
			}
			all = append(all, body.Tags...)
			next = parseLinkHeader(resp.Header.Get("Link"))
		}()
		if err != nil {
			return nil, err
		}
	}
	return all, nil
}

func (c *Client) GetImageTagsTimed(ctx context.Context, registry, repository, token string) ([]string, time.Duration, error) {
	start := time.Now()
	t, err := c.GetImageTags(ctx, registry, repository, token)
	return t, time.Since(start), err
}

func parseLinkHeader(h string) string {
	if h == "" {
		return ""
	}
	for _, part := range strings.Split(h, ",") {
		p := strings.TrimSpace(part)
		if strings.Contains(p, `rel="next"`) {
			l := strings.Index(p, "<")
			r := strings.Index(p, ">")
			if l != -1 && r > l {
				return p[l+1 : r]
			}
		}
	}
	return ""
}
