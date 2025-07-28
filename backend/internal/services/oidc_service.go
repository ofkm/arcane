package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/models"
)

type OidcDiscoveryDocument struct {
	Issuer                        string   `json:"issuer"`
	AuthorizationEndpoint         string   `json:"authorization_endpoint"`
	TokenEndpoint                 string   `json:"token_endpoint"`
	UserinfoEndpoint              string   `json:"userinfo_endpoint"`
	JwksURI                       string   `json:"jwks_uri"`
	ScopesSupported               []string `json:"scopes_supported"`
	ResponseTypesSupported        []string `json:"response_types_supported"`
	CodeChallengeMethodsSupported []string `json:"code_challenge_methods_supported"`
}

type OidcService struct {
	authService    *AuthService
	config         *config.Config
	httpClient     *http.Client
	discoveryCache map[string]*OidcDiscoveryDocument
	cacheMutex     sync.RWMutex
	cacheExpiry    map[string]time.Time
}

type OidcState struct {
	State        string    `json:"state"`
	CodeVerifier string    `json:"code_verifier"`
	RedirectTo   string    `json:"redirect_to"`
	CreatedAt    time.Time `json:"created_at"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
}

func NewOidcService(authService *AuthService, cfg *config.Config) *OidcService {
	return &OidcService{
		authService: authService,
		config:      cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		discoveryCache: make(map[string]*OidcDiscoveryDocument),
		cacheExpiry:    make(map[string]time.Time),
	}
}

func (s *OidcService) discoverOidcEndpoints(ctx context.Context, issuerURL string) (*OidcDiscoveryDocument, error) {
	s.cacheMutex.RLock()
	if cached, exists := s.discoveryCache[issuerURL]; exists {
		if expiry, hasExpiry := s.cacheExpiry[issuerURL]; hasExpiry && time.Now().Before(expiry) {
			s.cacheMutex.RUnlock()
			return cached, nil
		}
	}
	s.cacheMutex.RUnlock()

	// Construct well-known URL
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

	// Read the response body for better error reporting
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

	var discovery OidcDiscoveryDocument
	if err := json.Unmarshal(bodyBytes, &discovery); err != nil {
		return nil, fmt.Errorf("failed to decode discovery document from %s: %w. Response body: %s",
			wellKnownURL, err, string(bodyBytes[:min(500, len(bodyBytes))]))
	}

	if discovery.AuthorizationEndpoint == "" || discovery.TokenEndpoint == "" {
		return nil, fmt.Errorf("discovery document missing required endpoints. Auth: %s, Token: %s",
			discovery.AuthorizationEndpoint, discovery.TokenEndpoint)
	}

	s.cacheMutex.Lock()
	s.discoveryCache[issuerURL] = &discovery
	s.cacheExpiry[issuerURL] = time.Now().Add(1 * time.Hour)
	s.cacheMutex.Unlock()

	return &discovery, nil
}

func (s *OidcService) getEffectiveConfig(ctx context.Context) (*models.OidcConfig, error) {
	config, err := s.authService.GetOidcConfig(ctx)
	if err != nil {
		return nil, err
	}

	// If we already have endpoints configured (legacy), use them
	if config.AuthorizationEndpoint != "" && config.TokenEndpoint != "" {
		return config, nil
	}

	// Otherwise, discover endpoints
	if config.IssuerURL == "" {
		return nil, errors.New("either issuerUrl or explicit endpoints must be configured")
	}

	discovery, err := s.discoverOidcEndpoints(ctx, config.IssuerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to discover OIDC endpoints: %w", err)
	}

	// Create effective config with discovered endpoints
	effectiveConfig := *config
	effectiveConfig.AuthorizationEndpoint = discovery.AuthorizationEndpoint
	effectiveConfig.TokenEndpoint = discovery.TokenEndpoint
	effectiveConfig.UserinfoEndpoint = discovery.UserinfoEndpoint
	effectiveConfig.JwksURI = discovery.JwksURI

	return &effectiveConfig, nil
}

func (s *OidcService) GenerateAuthURL(ctx context.Context, redirectTo string) (string, string, error) {
	// Get effective OIDC configuration with discovered endpoints
	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		return "", "", err
	}

	// Generate state and code verifier for PKCE
	state := generateRandomString(32)
	codeVerifier := generateRandomString(128)
	codeChallenge := generateCodeChallenge(codeVerifier)

	// Parse scopes
	scopes := strings.Fields(config.Scopes)
	if len(scopes) == 0 {
		scopes = []string{"openid", "email", "profile"}
	}

	// Build authorization URL
	authURL, err := url.Parse(config.AuthorizationEndpoint)
	if err != nil {
		return "", "", fmt.Errorf("invalid authorization endpoint: %w", err)
	}

	// Get auto-generated redirect URI from config
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

	// Store state with code verifier
	stateData := OidcState{
		State:        state,
		CodeVerifier: codeVerifier,
		RedirectTo:   redirectTo,
		CreatedAt:    time.Now(),
	}

	// Encode state data as base64 for storage
	stateJSON, err := json.Marshal(stateData)
	if err != nil {
		return "", "", err
	}
	encodedState := base64.URLEncoding.EncodeToString(stateJSON)

	return authURL.String(), encodedState, nil
}

func (s *OidcService) HandleCallback(ctx context.Context, code, state, storedState string) (*OidcUserInfo, error) {
	// Decode stored state to get the original state value and code verifier
	stateData, err := s.decodeState(storedState)
	if err != nil {
		return nil, fmt.Errorf("failed to decode state: %w", err)
	}

	// Verify state matches what we originally sent
	if state != stateData.State {
		return nil, errors.New("invalid state parameter")
	}

	// Check if state is not too old (10 minutes max)
	if time.Since(stateData.CreatedAt) > 10*time.Minute {
		return nil, errors.New("state has expired")
	}

	// Get effective OIDC configuration with discovered endpoints
	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		return nil, err
	}

	// Exchange code for tokens
	tokenResponse, err := s.exchangeCodeForTokens(ctx, config, code, stateData.CodeVerifier)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for tokens: %w", err)
	}

	// Get user info from the userinfo endpoint
	userInfo, err := s.getUserInfo(ctx, config, tokenResponse.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	return userInfo, nil
}

func (s *OidcService) exchangeCodeForTokens(ctx context.Context, config *models.OidcConfig, code, codeVerifier string) (*TokenResponse, error) {
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

	var tokenResponse TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return nil, err
	}

	return &tokenResponse, nil
}

func (s *OidcService) getUserInfo(ctx context.Context, config *models.OidcConfig, accessToken string) (*OidcUserInfo, error) {
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

	var userInfo OidcUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
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

// Helper functions

func generateRandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}

func generateCodeChallenge(verifier string) string {
	hash := sha256.Sum256([]byte(verifier))
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(hash[:])
}
