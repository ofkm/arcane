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
	"time"

	"github.com/ofkm/arcane-backend/internal/models"
)

// OidcService handles OIDC authentication flows
type OidcService struct {
	authService *AuthService
	httpClient  *http.Client
}

// OidcState represents the OIDC state parameter with additional metadata
type OidcState struct {
	State        string    `json:"state"`
	CodeVerifier string    `json:"code_verifier"`
	RedirectTo   string    `json:"redirect_to"`
	CreatedAt    time.Time `json:"created_at"`
}

// TokenResponse represents the response from the OIDC token endpoint
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
}

// NewOidcService creates a new OIDC service instance
func NewOidcService(authService *AuthService) *OidcService {
	return &OidcService{
		authService: authService,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GenerateAuthURL creates an OIDC authorization URL with PKCE
func (s *OidcService) GenerateAuthURL(ctx context.Context, redirectTo string) (string, string, error) {
	// Get OIDC configuration
	config, err := s.authService.GetOidcConfig(ctx)
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

	query := authURL.Query()
	query.Set("response_type", "code")
	query.Set("client_id", config.ClientID)
	query.Set("redirect_uri", config.RedirectURI)
	query.Set("scope", strings.Join(scopes, " "))
	query.Set("state", state)
	query.Set("code_challenge", codeChallenge)
	query.Set("code_challenge_method", "S256")
	authURL.RawQuery = query.Encode()

	// Store state with code verifier (in production, use Redis or database)
	// For now, we'll return both and expect the caller to manage state
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

// HandleCallback processes the OIDC callback and exchanges code for tokens
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

	// Get OIDC configuration
	config, err := s.authService.GetOidcConfig(ctx)
	if err != nil {
		return nil, err
	}

	// Exchange code for tokens
	tokenResponse, err := s.exchangeCodeForTokens(config, code, stateData.CodeVerifier)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for tokens: %w", err)
	}

	// Get user info from the userinfo endpoint
	userInfo, err := s.getUserInfo(config, tokenResponse.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	return userInfo, nil
}

// exchangeCodeForTokens exchanges the authorization code for access tokens
func (s *OidcService) exchangeCodeForTokens(config *models.OidcConfig, code, codeVerifier string) (*TokenResponse, error) {
	// Prepare token request
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", config.RedirectURI)
	data.Set("client_id", config.ClientID)
	data.Set("client_secret", config.ClientSecret)
	data.Set("code_verifier", codeVerifier)

	// Make token request
	req, err := http.NewRequest("POST", config.TokenEndpoint, strings.NewReader(data.Encode()))
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

	// Parse token response
	var tokenResponse TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return nil, err
	}

	return &tokenResponse, nil
}

// getUserInfo retrieves user information from the userinfo endpoint
func (s *OidcService) getUserInfo(config *models.OidcConfig, accessToken string) (*OidcUserInfo, error) {
	// Make userinfo request
	req, err := http.NewRequest("GET", config.UserinfoEndpoint, nil)
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

	// Parse userinfo response
	var userInfo OidcUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	// Validate required fields
	if userInfo.Subject == "" {
		return nil, errors.New("missing required 'sub' field in userinfo response")
	}

	return &userInfo, nil
}

// decodeState decodes the base64-encoded state data
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

// generateRandomString generates a cryptographically secure random string
func generateRandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}

// generateCodeChallenge generates a PKCE code challenge from a verifier
func generateCodeChallenge(verifier string) string {
	hash := sha256.Sum256([]byte(verifier))
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(hash[:])
}
