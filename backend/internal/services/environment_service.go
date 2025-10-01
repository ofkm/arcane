package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
	"gorm.io/gorm"
)

type EnvironmentService struct {
	db         *database.DB
	httpClient *http.Client
}

func NewEnvironmentService(db *database.DB, httpClient *http.Client) *EnvironmentService {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &EnvironmentService{db: db, httpClient: httpClient}
}

func (s *EnvironmentService) CreateEnvironment(ctx context.Context, environment *models.Environment) (*models.Environment, error) {
	environment.ID = uuid.New().String()
	environment.Status = string(models.EnvironmentStatusOffline)
	now := time.Now()
	environment.CreatedAt = now
	environment.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Create(environment).Error; err != nil {
		return nil, fmt.Errorf("failed to create environment: %w", err)
	}

	return environment, nil
}

func (s *EnvironmentService) GetEnvironmentByID(ctx context.Context, id string) (*models.Environment, error) {
	var environment models.Environment
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&environment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("environment not found")
		}
		return nil, fmt.Errorf("failed to get environment: %w", err)
	}
	return &environment, nil
}

func (s *EnvironmentService) ListEnvironmentsPaginated(ctx context.Context, params pagination.QueryParams) ([]dto.EnvironmentDto, pagination.Response, error) {
	var envs []models.Environment
	q := s.db.WithContext(ctx).Model(&models.Environment{})

	if term := strings.TrimSpace(params.Search); term != "" {
		searchPattern := "%" + term + "%"
		q = q.Where(
			"name LIKE ? OR api_url LIKE ?",
			searchPattern, searchPattern,
		)
	}

	if status := params.Filters["status"]; status != "" {
		q = q.Where("status = ?", status)
	}
	if enabled := params.Filters["enabled"]; enabled != "" {
		switch enabled {
		case "true", "1":
			q = q.Where("enabled = ?", true)
		case "false", "0":
			q = q.Where("enabled = ?", false)
		}
	}

	paginationResp, err := pagination.PaginateAndSortDB(params, q, &envs)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to paginate environments: %w", err)
	}

	out, mapErr := dto.MapSlice[models.Environment, dto.EnvironmentDto](envs)
	if mapErr != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to map environments: %w", mapErr)
	}

	return out, paginationResp, nil
}

func (s *EnvironmentService) UpdateEnvironment(ctx context.Context, id string, updates map[string]interface{}) (*models.Environment, error) {
	now := time.Now()
	updates["updated_at"] = &now

	if err := s.db.WithContext(ctx).Model(&models.Environment{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update environment: %w", err)
	}

	return s.GetEnvironmentByID(ctx, id)
}

func (s *EnvironmentService) DeleteEnvironment(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Environment{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete environment: %w", err)
	}
	return nil
}

func (s *EnvironmentService) TestConnection(ctx context.Context, id string) (string, error) {
	environment, err := s.GetEnvironmentByID(ctx, id)
	if err != nil {
		return "error", err
	}

	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	url := strings.TrimRight(environment.ApiUrl, "/") + "/api/health"
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
	if err != nil {
		_ = s.updateEnvironmentStatusInternal(ctx, id, string(models.EnvironmentStatusOffline))
		return "offline", fmt.Errorf("failed to create request: %w", err)
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		_ = s.updateEnvironmentStatusInternal(ctx, id, string(models.EnvironmentStatusOffline))
		return "offline", fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		_ = s.updateEnvironmentStatusInternal(ctx, id, string(models.EnvironmentStatusOnline))
		return "online", nil
	}

	_ = s.updateEnvironmentStatusInternal(ctx, id, string(models.EnvironmentStatusError))
	return "error", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
}

func (s *EnvironmentService) updateEnvironmentStatusInternal(ctx context.Context, id, status string) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status":     status,
		"last_seen":  &now,
		"updated_at": &now,
	}
	if err := s.db.WithContext(ctx).Model(&models.Environment{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update environment status: %w", err)
	}
	return nil
}

func (s *EnvironmentService) UpdateEnvironmentHeartbeat(ctx context.Context, id string) error {
	now := time.Now()
	if err := s.db.WithContext(ctx).Model(&models.Environment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_seen":  &now,
		"status":     string(models.EnvironmentStatusOnline),
		"updated_at": &now,
	}).Error; err != nil {
		return fmt.Errorf("failed to update environment heartbeat: %w", err)
	}
	return nil
}

func (s *EnvironmentService) PairAgentWithBootstrap(ctx context.Context, apiUrl, bootstrapToken string) (string, error) {
	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, strings.TrimRight(apiUrl, "/")+"/api/environments/0/agent/pair", nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("X-Arcane-Agent-Bootstrap", bootstrapToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var parsed struct {
		Success bool `json:"success"`
		Data    struct {
			Token string `json:"token"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}
	if !parsed.Success || parsed.Data.Token == "" {
		return "", fmt.Errorf("pairing unsuccessful")
	}

	return parsed.Data.Token, nil
}

func (s *EnvironmentService) PairAndPersistAgentToken(ctx context.Context, environmentID, apiUrl, bootstrapToken string) (string, error) {
	token, err := s.PairAgentWithBootstrap(ctx, apiUrl, bootstrapToken)
	if err != nil {
		return "", err
	}
	if err := s.db.WithContext(ctx).
		Model(&models.Environment{}).
		Where("id = ?", environmentID).
		Update("access_token", token).Error; err != nil {
		return "", fmt.Errorf("failed to persist agent token: %w", err)
	}
	return token, nil
}

func (s *EnvironmentService) BuildWSAuthHeadersFromRequest(req *http.Request, agentToken string) http.Header {
	h := http.Header{}
	if auth := req.Header.Get("Authorization"); auth != "" {
		h.Set("Authorization", auth)
	} else if c, err := req.Cookie("token"); err == nil && c != nil && c.Value != "" {
		h.Set("Authorization", "Bearer "+c.Value)
	}

	// If no Authorization header was set, forward original cookies (needed for external SSO like Authelia).
	if h.Get("Authorization") == "" {
		if cookieHeader := req.Header.Get("Cookie"); cookieHeader != "" {
			// Pass through all cookies so upstream auth (Authelia) still sees its session.
			h.Set("Cookie", cookieHeader)
		}
	}

	if agentToken != "" {
		h.Set("X-Arcane-Agent-Token", agentToken)
	}
	return h
}

func wsScheme(req *http.Request) string {
	// Prefer explicit headers set by reverse proxies.
	check := func(v string) string {
		v = strings.TrimSpace(strings.ToLower(v))
		if v == "" {
			return ""
		}
		if strings.HasPrefix(v, "https") {
			return "wss"
		}
		if strings.HasPrefix(v, "http") {
			return "ws"
		}
		return ""
	}

	if s := check(req.Header.Get("X-Forwarded-Proto")); s != "" {
		return s
	}
	if s := check(req.Header.Get("X-Forwarded-Scheme")); s != "" {
		return s
	}

	// Parse standardized Forwarded header: Forwarded: proto=https; host=...
	if fwd := req.Header.Get("Forwarded"); fwd != "" {
		// naive parse: split by ; and ,
		parts := strings.Split(fwd, ";")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if strings.HasPrefix(strings.ToLower(p), "proto=") {
				if s := check(strings.TrimPrefix(p, "proto=")); s != "" {
					return s
				}
			}
		}
	}

	// Fallback: infer from Origin
	if origin := req.Header.Get("Origin"); strings.HasPrefix(strings.ToLower(origin), "https://") {
		return "wss"
	}

	// Direct TLS?
	if req.TLS != nil {
		return "wss"
	}
	return "ws"
}

func (s *EnvironmentService) BuildLocalWSTarget(req *http.Request, absolutePath string, agentToken string) (string, http.Header) {
	u := &url.URL{
		Scheme:   wsScheme(req),
		Host:     req.Host,
		Path:     absolutePath,
		RawQuery: req.URL.RawQuery,
	}
	h := s.BuildWSAuthHeadersFromRequest(req, agentToken)
	return u.String(), h
}

// BuildRemoteWSTarget returns ws URL and headers for a remote environment.
// absolutePath should be the full API path (e.g. "/api/environments/0/stats/ws").
func (s *EnvironmentService) BuildRemoteWSTarget(environment *models.Environment, absolutePath string, req *http.Request) (string, http.Header, error) {
	base, err := url.Parse(strings.TrimRight(environment.ApiUrl, "/"))
	if err != nil {
		return "", nil, fmt.Errorf("invalid environment url: %w", err)
	}
	if base.Scheme == "https" {
		base.Scheme = "wss"
	} else {
		base.Scheme = "ws"
	}
	base.Path = path.Join(base.Path, absolutePath)
	base.RawQuery = req.URL.RawQuery

	agentToken := ""
	if environment.AccessToken != nil {
		agentToken = *environment.AccessToken
	}
	h := s.BuildWSAuthHeadersFromRequest(req, agentToken)
	return base.String(), h, nil
}

func (s *EnvironmentService) GetDB() *database.DB {
	return s.db
}

func (s *EnvironmentService) GetEnabledRegistryCredentials(ctx context.Context) ([]dto.ContainerRegistryCredential, error) {
	var registries []models.ContainerRegistry
	if err := s.db.WithContext(ctx).Where("enabled = ?", true).Find(&registries).Error; err != nil {
		return nil, fmt.Errorf("failed to get enabled container registries: %w", err)
	}

	var creds []dto.ContainerRegistryCredential
	for _, reg := range registries {
		if !reg.Enabled || reg.Username == "" || reg.Token == "" {
			continue
		}

		decryptedToken, err := utils.Decrypt(reg.Token)
		if err != nil {
			slog.WarnContext(ctx, "Failed to decrypt registry token",
				slog.String("registryURL", reg.URL),
				slog.String("error", err.Error()))
			continue
		}

		creds = append(creds, dto.ContainerRegistryCredential{
			URL:      reg.URL,
			Username: reg.Username,
			Token:    decryptedToken,
			Enabled:  reg.Enabled,
		})
	}

	return creds, nil
}
