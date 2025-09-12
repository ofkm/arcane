package registry

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type TestResult struct {
	OverallSuccess bool      `json:"overall_success"`
	PingSuccess    bool      `json:"ping_success"`
	AuthSuccess    bool      `json:"auth_success"`
	CatalogSuccess bool      `json:"catalog_success"`
	URL            string    `json:"url"`
	Domain         string    `json:"domain"`
	Timestamp      time.Time `json:"timestamp"`
	Errors         []string  `json:"errors"`
}

func TestRegistryConnection(ctx context.Context, registryURL string, creds *Credentials) (*TestResult, error) {
	c := NewClient()
	res := &TestResult{
		URL:       registryURL,
		Domain:    registryURL,
		Timestamp: time.Now(),
		Errors:    []string{},
	}

	reg := trimScheme(registryURL)
	if reg == "docker.io" {
		reg = DefaultRegistry
	}

	authURL, err := c.CheckAuth(ctx, reg)
	if err != nil {
		res.Errors = append(res.Errors, fmt.Sprintf("Ping failed: %v", err))
		res.PingSuccess = false
	} else {
		res.PingSuccess = true
	}

	if authURL != "" && creds != nil {
		tok, err := c.GetToken(ctx, authURL, "library/hello-world", creds)
		if err != nil {
			res.Errors = append(res.Errors, fmt.Sprintf("Auth failed: %v", err))
			res.AuthSuccess = false
		} else {
			res.AuthSuccess = tok != ""
		}
	} else {
		res.AuthSuccess = authURL == ""
	}

	tags, err := c.GetImageTags(ctx, reg, "library/hello-world", "")
	if err != nil {
		res.Errors = append(res.Errors, fmt.Sprintf("Catalog failed: %v", err))
		res.CatalogSuccess = false
	} else {
		res.CatalogSuccess = len(tags) > 0
	}

	res.OverallSuccess = res.PingSuccess && res.AuthSuccess && res.CatalogSuccess
	return res, nil
}

func trimScheme(u string) string {
	u = strings.TrimPrefix(u, "https://")
	u = strings.TrimPrefix(u, "http://")
	u = strings.TrimSuffix(u, "/")
	return u
}
