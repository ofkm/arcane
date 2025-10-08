package registry

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	dockerregistry "github.com/docker/docker/registry"
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

	// Use official docker/registry client to ping the registry
	registryEndpoint := c.GetRegistryURL(reg)
	endpointURL, err := url.Parse(registryEndpoint)
	if err != nil {
		res.Errors = append(res.Errors, fmt.Sprintf("Invalid registry URL: %v", err))
		res.PingSuccess = false
		res.OverallSuccess = false
		return res, nil
	}

	challengeManager, err := dockerregistry.PingV2Registry(endpointURL, c.http.Transport)
	if err != nil {
		res.Errors = append(res.Errors, fmt.Sprintf("Connectivity test failed: %v", err))
		res.PingSuccess = false
		res.AuthSuccess = false
		res.CatalogSuccess = false
		res.OverallSuccess = false
		return res, nil
	}
	res.PingSuccess = true

	// Extract auth URL from challenge manager if available
	var authURL string
	if challengeManager != nil {
		challenges, err := challengeManager.GetChallenges(*endpointURL)
		if err == nil {
			for _, challenge := range challenges {
				if challenge.Scheme == "bearer" {
					if realm, ok := challenge.Parameters["realm"]; ok {
						authURL = realm
						if service, ok := challenge.Parameters["service"]; ok {
							authURL = fmt.Sprintf("%s?service=%s", realm, service)
						}
					}
				}
			}
		}
	}

	var authHeader string

	if authURL != "" && creds != nil {
		if tok, err := c.GetTokenMulti(ctx, authURL, []string{}, creds); err == nil && tok != "" {
			res.AuthSuccess = true
			authHeader = "Bearer " + tok
		} else {
			pingURL := c.GetRegistryURL(reg) + "/v2/"
			ctx2, cancel := context.WithTimeout(ctx, 10*time.Second)
			defer cancel()
			req, rerr := http.NewRequestWithContext(ctx2, http.MethodGet, pingURL, nil)
			if rerr == nil {
				req.SetBasicAuth(creds.Username, creds.Token)
				resp, derr := c.http.Do(req)
				if derr == nil {
					defer resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						res.AuthSuccess = true
						ba := []byte(creds.Username + ":" + creds.Token)
						authHeader = "Basic " + base64.StdEncoding.EncodeToString(ba)
					} else {
						res.Errors = append(res.Errors, fmt.Sprintf("Auth failed: status %d", resp.StatusCode))
						res.AuthSuccess = false
					}
				} else {
					res.Errors = append(res.Errors, fmt.Sprintf("Auth request failed: %v", derr))
					res.AuthSuccess = false
				}
			} else {
				res.Errors = append(res.Errors, fmt.Sprintf("Auth request creation failed: %v", rerr))
				res.AuthSuccess = false
			}
		}
	} else {
		res.AuthSuccess = (authURL == "")
	}

	catalogURL := c.GetRegistryURL(reg) + "/v2/_catalog"
	ctx3, cancel3 := context.WithTimeout(ctx, 15*time.Second)
	defer cancel3()
	req, err := http.NewRequestWithContext(ctx3, http.MethodGet, catalogURL, nil)
	if err != nil {
		res.Errors = append(res.Errors, fmt.Sprintf("Catalog request creation failed: %v", err))
		res.CatalogSuccess = false
	} else {
		if authHeader != "" {
			req.Header.Set("Authorization", authHeader)
		}
		resp, derr := c.http.Do(req)
		if derr != nil {
			res.Errors = append(res.Errors, fmt.Sprintf("Catalog request failed: %v", derr))
			res.CatalogSuccess = false
		} else {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				res.CatalogSuccess = true
			} else {
				res.CatalogSuccess = false
				res.Errors = append(res.Errors, fmt.Sprintf("Catalog returned status: %d", resp.StatusCode))
			}
		}
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
