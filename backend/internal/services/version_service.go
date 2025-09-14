package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/utils/cache"
)

const (
	versionTTL            = 3 * time.Hour
	versionCheckURL       = "https://api.github.com/repos/ofkm/arcane/releases/latest"
	defaultRequestTimeout = 5 * time.Second
)

type VersionService struct {
	httpClient *http.Client
	cache      *cache.Cache[string]
	disabled   bool
}

func NewVersionService(httpClient *http.Client, disabled bool) *VersionService {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &VersionService{
		httpClient: httpClient,
		cache:      cache.New[string](versionTTL),
		disabled:   disabled,
	}
}

func (s *VersionService) GetLatestVersion(ctx context.Context) (string, error) {
	version, err := s.cache.GetOrFetch(ctx, func(ctx context.Context) (string, error) {
		reqCtx, cancel := context.WithTimeout(ctx, defaultRequestTimeout)
		defer cancel()

		req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, versionCheckURL, nil)
		if err != nil {
			return "", fmt.Errorf("create GitHub request: %w", err)
		}

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("get latest release: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
		}

		var payload struct {
			TagName string `json:"tag_name"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			return "", fmt.Errorf("decode payload: %w", err)
		}
		if payload.TagName == "" {
			return "", fmt.Errorf("GitHub API returned empty tag name")
		}

		return strings.TrimPrefix(payload.TagName, "v"), nil
	})

	var staleErr *cache.ErrStale
	if errors.As(err, &staleErr) {
		slog.Warn("Failed to fetch latest version, returning stale cache", "error", staleErr.Err)
		return version, nil
	}

	return version, err
}

func (s *VersionService) IsNewer(latest, current string) bool {
	lp := parseSemver(latest)
	cp := parseSemver(current)
	for i := 0; i < 3; i++ {
		if lp[i] > cp[i] {
			return true
		}
		if lp[i] < cp[i] {
			return false
		}
	}
	return false
}

func (s *VersionService) ReleaseURL(version string) string {
	if strings.TrimSpace(version) == "" {
		return "https://github.com/ofkm/arcane/releases/latest"
	}
	return "https://github.com/ofkm/arcane/releases/tag/v" + version
}

type VersionInformation struct {
	CurrentVersion  string `json:"currentVersion"`
	NewestVersion   string `json:"newestVersion,omitempty"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseURL      string `json:"releaseUrl,omitempty"`
}

func (s *VersionService) GetVersionInformation(ctx context.Context, currentVersion string) (*VersionInformation, error) {
	cur := strings.TrimPrefix(strings.TrimSpace(currentVersion), "v")

	if s.disabled {
		return &VersionInformation{
			CurrentVersion:  cur,
			NewestVersion:   "",
			UpdateAvailable: false,
			ReleaseURL:      s.ReleaseURL(""),
		}, nil
	}

	latest, err := s.GetLatestVersion(ctx)
	if err != nil {
		var staleErr *cache.ErrStale
		if errors.As(err, &staleErr) {
			slog.Warn("Failed to refresh latest version; using stale cache", "error", staleErr.Err)
		} else {
			return &VersionInformation{
				CurrentVersion: cur,
				ReleaseURL:     s.ReleaseURL(""),
			}, err
		}
	}

	return &VersionInformation{
		CurrentVersion:  cur,
		NewestVersion:   latest,
		UpdateAvailable: s.IsNewer(latest, cur),
		ReleaseURL:      s.ReleaseURL(latest),
	}, nil
}

func parseSemver(s string) [3]int {
	var out [3]int
	part := 0
	num := 0
	sign := 1

	flush := func() {
		if part < 3 {
			out[part] = sign * num
			part++
		}
		num = 0
		sign = 1
	}

	for i := 0; i < len(s); i++ {
		switch c := s[i]; {
		case c == '-':
			i = len(s)
		case c == '.':
			flush()
		case c >= '0' && c <= '9':
			num = num*10 + int(c-'0')
		case c == '+' || c == 'v' || c == 'V':
		default:
			i = len(s)
		}
	}
	flush()
	return out
}
