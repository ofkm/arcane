package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type OidcService struct {
	authService *AuthService
	config      *config.Config
	httpClient  *http.Client
}

type OidcState struct {
	State        string    `json:"state"`
	CodeVerifier string    `json:"code_verifier"`
	RedirectTo   string    `json:"redirect_to"`
	CreatedAt    time.Time `json:"created_at"`
}

func NewOidcService(authService *AuthService, cfg *config.Config, httpClient *http.Client) *OidcService {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &OidcService{
		authService: authService,
		config:      cfg,
		httpClient:  httpClient,
	}
}

func (s *OidcService) discoverOidcEndpoints(ctx context.Context, issuerURL string) (*dto.OidcDiscoveryDocument, error) {
	wellKnownURL := strings.TrimSuffix(issuerURL, "/") + "/.well-known/openid-configuration"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, wellKnownURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create discovery request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Arcane-OIDC-Client/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch OIDC discovery document from %s: %w", wellKnownURL, err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read discovery response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OIDC discovery endpoint %s returned %d: %s",
			wellKnownURL, resp.StatusCode, string(bodyBytes))
	}

	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(contentType, "application/json") {
		return nil, fmt.Errorf("OIDC discovery endpoint returned non-JSON content-type: %s, body: %s",
			contentType, string(bodyBytes[:min(500, len(bodyBytes))]))
	}

	var discovery dto.OidcDiscoveryDocument
	if err := json.Unmarshal(bodyBytes, &discovery); err != nil {
		return nil, fmt.Errorf("failed to decode discovery document from %s: %w. Response body: %s",
			wellKnownURL, err, string(bodyBytes[:min(500, len(bodyBytes))]))
	}

	if discovery.AuthorizationEndpoint == "" || discovery.TokenEndpoint == "" {
		return nil, fmt.Errorf("discovery document missing required endpoints. Auth: %s, Token: %s",
			discovery.AuthorizationEndpoint, discovery.TokenEndpoint)
	}

	return &discovery, nil
}

func (s *OidcService) getEffectiveConfig(ctx context.Context) (*models.OidcConfig, error) {
	config, err := s.authService.GetOidcConfig(ctx)
	if err != nil {
		return nil, err
	}

	if config.IssuerURL == "" {
		return nil, errors.New("either issuerUrl or explicit endpoints must be configured")
	}

	discovery, err := s.discoverOidcEndpoints(ctx, config.IssuerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to discover OIDC endpoints: %w", err)
	}

	effectiveConfig := *config
	effectiveConfig.AuthorizationEndpoint = discovery.AuthorizationEndpoint
	effectiveConfig.TokenEndpoint = discovery.TokenEndpoint
	effectiveConfig.UserinfoEndpoint = discovery.UserinfoEndpoint
	effectiveConfig.JwksURI = discovery.JwksURI

	return &effectiveConfig, nil
}

func (s *OidcService) GenerateAuthURL(ctx context.Context, redirectTo string) (string, string, error) {
	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		return "", "", err
	}

	state := utils.GenerateRandomString(32)
	codeVerifier := utils.GenerateRandomString(128)
	codeChallenge := utils.GenerateCodeChallenge(codeVerifier)

	scopes := strings.Fields(config.Scopes)
	if len(scopes) == 0 {
		scopes = []string{"openid", "email", "profile"}
	}

	authURL, err := url.Parse(config.AuthorizationEndpoint)
	if err != nil {
		return "", "", fmt.Errorf("invalid authorization endpoint: %w", err)
	}
	redirectURI := s.config.GetOidcRedirectURI()

	query := authURL.Query()
	query.Set("response_type", "code")
	query.Set("client_id", config.ClientID)
	query.Set("redirect_uri", redirectURI)
	query.Set("scope", strings.Join(scopes, " "))
	query.Set("state", state)
	query.Set("code_challenge", codeChallenge)
	query.Set("code_challenge_method", "S256")
	authURL.RawQuery = query.Encode()

	stateData := OidcState{
		State:        state,
		CodeVerifier: codeVerifier,
		RedirectTo:   redirectTo,
		CreatedAt:    time.Now(),
	}

	stateJSON, err := json.Marshal(stateData)
	if err != nil {
		return "", "", err
	}
	encodedState := base64.URLEncoding.EncodeToString(stateJSON)

	return authURL.String(), encodedState, nil
}

func (s *OidcService) HandleCallback(ctx context.Context, code, state, storedState string) (*dto.OidcUserInfo, *dto.OidcTokenResponse, error) {
	stateData, err := s.decodeState(storedState)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to decode state: %w", err)
	}

	if state != stateData.State {
		return nil, nil, errors.New("invalid state parameter")
	}

	// Check if state is not too old (10 minutes max)
	if time.Since(stateData.CreatedAt) > 10*time.Minute {
		return nil, nil, errors.New("state has expired")
	}

	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		return nil, nil, err
	}

	tokenResponse, err := s.exchangeCodeForTokens(ctx, config, code, stateData.CodeVerifier)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to exchange code for tokens: %w", err)
	}

	userInfo, err := s.getUserInfo(ctx, config, tokenResponse.AccessToken)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get user info: %w", err)
	}

	return userInfo, tokenResponse, nil
}

func (s *OidcService) RefreshToken(ctx context.Context, refreshToken string) (*dto.OidcTokenResponse, error) {
	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		return nil, err
	}

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("client_id", config.ClientID)
	data.Set("client_secret", config.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, config.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token endpoint returned %d on refresh: %s", resp.StatusCode, string(bodyBytes))
	}

	var tokenResponse dto.OidcTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return nil, err
	}
	return &tokenResponse, nil
}

func (s *OidcService) exchangeCodeForTokens(ctx context.Context, config *models.OidcConfig, code, codeVerifier string) (*dto.OidcTokenResponse, error) {
	redirectURI := s.config.GetOidcRedirectURI()

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)
	data.Set("client_id", config.ClientID)
	data.Set("client_secret", config.ClientSecret)
	data.Set("code_verifier", codeVerifier)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, config.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var tokenResponse dto.OidcTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return nil, err
	}

	return &tokenResponse, nil
}

func (s *OidcService) getUserInfo(ctx context.Context, config *models.OidcConfig, accessToken string) (*dto.OidcUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, config.UserinfoEndpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("userinfo endpoint returned %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var raw map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	userInfo := dto.OidcUserInfo{
		Subject:           utils.GetStringClaim(raw, "sub"),
		Name:              utils.GetStringClaim(raw, "name"),
		Email:             utils.GetStringClaim(raw, "email"),
		PreferredUsername: utils.GetStringClaim(raw, "preferred_username"),
		GivenName:         utils.GetStringClaim(raw, "given_name"),
		FamilyName:        utils.GetStringClaim(raw, "family_name"),
		Admin:             utils.GetBoolClaim(raw, "admin"),
		Roles:             utils.GetStringSliceClaim(raw, "roles"),
		Groups:            utils.GetStringSliceClaim(raw, "groups"),
		Extra:             raw,
	}

	if userInfo.Subject == "" {
		return nil, errors.New("missing required 'sub' field in userinfo response")
	}

	return &userInfo, nil
}

func (s *OidcService) decodeState(encodedState string) (*OidcState, error) {
	stateJSON, err := base64.URLEncoding.DecodeString(encodedState)
	if err != nil {
		return nil, err
	}

	var stateData OidcState
	if err := json.Unmarshal(stateJSON, &stateData); err != nil {
		return nil, err
	}

	return &stateData, nil
}
