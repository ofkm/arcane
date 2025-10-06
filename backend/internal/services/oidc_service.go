package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"log/slog"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type OidcService struct {
	authService   *AuthService
	config        *config.Config
	httpClient    *http.Client
	providerCache *oidc.Provider
	providerMutex sync.RWMutex
	cachedIssuer  string
}

type OidcState struct {
	State        string    `json:"state"`
	Nonce        string    `json:"nonce"`
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

func (s *OidcService) getEffectiveConfig(ctx context.Context) (*models.OidcConfig, error) {
	config, err := s.authService.GetOidcConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get OIDC config: %w", err)
	}
	if config.IssuerURL == "" {
		return nil, errors.New("issuer URL must be configured")
	}
	return config, nil
}

func (s *OidcService) ensureOpenIDScope(scopes []string) []string {
	hasOpenID := false
	for _, scope := range scopes {
		if scope == oidc.ScopeOpenID {
			hasOpenID = true
			break
		}
	}
	if !hasOpenID {
		scopes = append([]string{oidc.ScopeOpenID}, scopes...)
	}
	return scopes
}

func (s *OidcService) GenerateAuthURL(ctx context.Context, redirectTo string) (string, string, error) {
	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		slog.Error("GenerateAuthURL: failed to get OIDC config", "error", err)
		return "", "", err
	}

	provider, err := s.getOrDiscoverProvider(ctx, config.IssuerURL)
	if err != nil {
		slog.Error("GenerateAuthURL: provider discovery failed", "issuer", config.IssuerURL, "error", err)
		return "", "", fmt.Errorf("failed to discover provider: %w", err)
	}

	state := utils.GenerateRandomString(32)
	nonce := utils.GenerateRandomString(32)
	codeVerifier := utils.GenerateRandomString(128)

	scopes := strings.Fields(config.Scopes)
	if len(scopes) == 0 {
		scopes = []string{"email", "profile"}
	}
	scopes = s.ensureOpenIDScope(scopes)

	oauth2Config := oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  s.config.GetOidcRedirectURI(),
		Scopes:       scopes,
	}

	authURL := oauth2Config.AuthCodeURL(state,
		oauth2.SetAuthURLParam("nonce", nonce),
		oauth2.S256ChallengeOption(codeVerifier),
	)

	stateData := OidcState{
		State:        state,
		Nonce:        nonce,
		CodeVerifier: codeVerifier,
		RedirectTo:   redirectTo,
		CreatedAt:    time.Now(),
	}

	stateJSON, err := json.Marshal(stateData)
	if err != nil {
		slog.Error("GenerateAuthURL: failed to marshal state", "error", err)
		return "", "", fmt.Errorf("failed to encode state: %w", err)
	}
	encodedState := base64.URLEncoding.EncodeToString(stateJSON)

	slog.Debug("GenerateAuthURL: generated authorization URL", "issuer", config.IssuerURL, "scopes", scopes)
	return authURL, encodedState, nil
}

func (s *OidcService) getOrDiscoverProvider(ctx context.Context, issuer string) (*oidc.Provider, error) {
	s.providerMutex.RLock()
	if s.providerCache != nil && s.cachedIssuer == issuer {
		provider := s.providerCache
		s.providerMutex.RUnlock()
		return provider, nil
	}
	s.providerMutex.RUnlock()

	s.providerMutex.Lock()
	defer s.providerMutex.Unlock()

	if s.providerCache != nil && s.cachedIssuer == issuer {
		return s.providerCache, nil
	}

	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	provider, err := oidc.NewProvider(providerCtx, issuer)
	if err != nil {
		slog.Error("getOrDiscoverProvider: discovery failed", "issuer", issuer, "error", err)
		return nil, fmt.Errorf("failed to discover provider at %s: %w", issuer, err)
	}

	s.providerCache = provider
	s.cachedIssuer = issuer
	slog.Debug("getOrDiscoverProvider: provider cached", "issuer", issuer)

	return provider, nil
}

func (s *OidcService) exchangeToken(ctx context.Context, cfg *models.OidcConfig, provider *oidc.Provider, code string, verifier string) (*oauth2.Token, error) {
	scopes := strings.Fields(cfg.Scopes)
	if len(scopes) == 0 {
		scopes = []string{"email", "profile"}
	}
	scopes = s.ensureOpenIDScope(scopes)

	oauth2Config := oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  s.config.GetOidcRedirectURI(),
		Scopes:       scopes,
	}

	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	token, err := oauth2Config.Exchange(providerCtx, code, oauth2.VerifierOption(verifier))
	if err != nil {
		slog.Error("exchangeToken: token exchange failed", "token_endpoint", oauth2Config.Endpoint.TokenURL, "error", err)
		return nil, fmt.Errorf("failed to exchange authorization code: %w", err)
	}

	slog.Debug("exchangeToken: token exchange successful", "has_access_token", token.AccessToken != "", "has_refresh_token", token.RefreshToken != "")
	return token, nil
}

func (s *OidcService) fetchClaims(ctx context.Context, provider *oidc.Provider, token *oauth2.Token, idToken *oidc.IDToken) (map[string]any, error) {
	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	var claims map[string]any

	if idToken != nil {
		if err := idToken.Claims(&claims); err != nil {
			slog.Warn("fetchClaims: failed to extract claims from ID token", "error", err)
		} else {
			slog.Debug("fetchClaims: extracted claims from ID token")
		}
	}

	userInfo, err := provider.UserInfo(providerCtx, oauth2.StaticTokenSource(token))
	if err != nil {
		slog.Debug("fetchClaims: userinfo endpoint call failed", "error", err)
		if claims != nil {
			return claims, nil
		}
		return nil, fmt.Errorf("failed to fetch userinfo: %w", err)
	}

	var userInfoClaims map[string]any
	if err := userInfo.Claims(&userInfoClaims); err != nil {
		slog.Warn("fetchClaims: failed to decode userinfo claims", "error", err)
		if claims != nil {
			return claims, nil
		}
		return nil, fmt.Errorf("failed to decode userinfo claims: %w", err)
	}

	slog.Debug("fetchClaims: fetched userinfo claims successfully")

	if claims == nil {
		claims = make(map[string]any)
	}
	for k, v := range userInfoClaims {
		if _, exists := claims[k]; !exists {
			claims[k] = v
		}
	}

	return claims, nil
}

func (s *OidcService) HandleCallback(ctx context.Context, code, state, storedState string) (*dto.OidcUserInfo, *dto.OidcTokenResponse, error) {
	slog.Debug("HandleCallback: processing callback", "code_present", code != "", "state_present", state != "")

	stateData, err := s.decodeState(storedState)
	if err != nil {
		slog.Error("HandleCallback: failed to decode stored state", "error", err)
		return nil, nil, fmt.Errorf("invalid state parameter: %w", err)
	}

	if state != stateData.State {
		slog.Error("HandleCallback: state mismatch", "received_len", len(state), "expected_len", len(stateData.State))
		return nil, nil, errors.New("state parameter mismatch")
	}

	if time.Since(stateData.CreatedAt) > 10*time.Minute {
		slog.Error("HandleCallback: state expired", "age", time.Since(stateData.CreatedAt))
		return nil, nil, errors.New("authentication state has expired")
	}

	cfg, err := s.getEffectiveConfig(ctx)
	if err != nil {
		slog.Error("HandleCallback: failed to get OIDC config", "error", err)
		return nil, nil, err
	}

	provider, err := s.getOrDiscoverProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, nil, err
	}

	token, err := s.exchangeToken(ctx, cfg, provider, code, stateData.CodeVerifier)
	if err != nil {
		return nil, nil, err
	}

	var rawIDToken string
	if idTokenValue := token.Extra("id_token"); idTokenValue != nil {
		if idTokenStr, ok := idTokenValue.(string); ok {
			rawIDToken = idTokenStr
		}
	}

	var idToken *oidc.IDToken
	if rawIDToken == "" {
		slog.Warn("HandleCallback: no ID token in response (non-compliant OIDC response)")
	} else {
		verifierConfig := &oidc.Config{
			ClientID: cfg.ClientID,
		}

		if stateData.Nonce != "" {
			verifierConfig.Now = time.Now
		}

		verifier := provider.Verifier(verifierConfig)
		providerCtx := oidc.ClientContext(ctx, s.httpClient)

		idToken, err = verifier.Verify(providerCtx, rawIDToken)
		if err != nil {
			slog.Error("HandleCallback: ID token verification failed", "error", err)
			return nil, nil, fmt.Errorf("failed to verify ID token: %w", err)
		}

		if stateData.Nonce != "" {
			var claims struct {
				Nonce string `json:"nonce"`
			}
			if err := idToken.Claims(&claims); err != nil {
				slog.Error("HandleCallback: failed to extract nonce from ID token", "error", err)
				return nil, nil, fmt.Errorf("failed to verify nonce: %w", err)
			}
			if claims.Nonce != stateData.Nonce {
				slog.Error("HandleCallback: nonce mismatch", "expected", stateData.Nonce, "got", claims.Nonce)
				return nil, nil, errors.New("nonce verification failed")
			}
		}

		slog.Debug("HandleCallback: ID token verified successfully", "subject", idToken.Subject, "issuer", idToken.Issuer)
	}

	claims, err := s.fetchClaims(ctx, provider, token, idToken)
	if err != nil {
		slog.Error("HandleCallback: failed to fetch claims", "error", err)
		return nil, nil, fmt.Errorf("failed to fetch user claims: %w", err)
	}

	subject := utils.GetStringClaim(claims, "sub")
	if subject == "" {
		slog.Error("HandleCallback: missing required 'sub' claim")
		return nil, nil, errors.New("missing required 'sub' claim in user info")
	}

	userInfoDto := dto.OidcUserInfo{
		Subject:           subject,
		Name:              utils.GetStringClaim(claims, "name"),
		Email:             utils.GetStringClaim(claims, "email"),
		PreferredUsername: utils.GetStringClaim(claims, "preferred_username"),
		GivenName:         utils.GetStringClaim(claims, "given_name"),
		FamilyName:        utils.GetStringClaim(claims, "family_name"),
		Admin:             utils.GetBoolClaim(claims, "admin"),
		Roles:             utils.GetStringSliceClaim(claims, "roles"),
		Groups:            utils.GetStringSliceClaim(claims, "groups"),
		Extra:             claims,
	}

	tokenType := token.TokenType
	if tokenType == "" {
		tokenType = "Bearer"
	}

	tokenResp := &dto.OidcTokenResponse{
		AccessToken:  token.AccessToken,
		TokenType:    tokenType,
		RefreshToken: token.RefreshToken,
		IDToken:      rawIDToken,
	}
	if !token.Expiry.IsZero() {
		expiresIn := int(time.Until(token.Expiry).Seconds())
		if expiresIn < 0 {
			expiresIn = 0
		}
		tokenResp.ExpiresIn = expiresIn
	}

	slog.Info("HandleCallback: authentication successful", "subject", userInfoDto.Subject, "email", userInfoDto.Email)
	return &userInfoDto, tokenResp, nil
}

func (s *OidcService) RefreshToken(ctx context.Context, refreshToken string) (*dto.OidcTokenResponse, error) {
	if refreshToken == "" {
		return nil, errors.New("refresh token is required")
	}

	cfg, err := s.getEffectiveConfig(ctx)
	if err != nil {
		slog.Error("RefreshToken: failed to get OIDC config", "error", err)
		return nil, err
	}

	provider, err := s.getOrDiscoverProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, err
	}

	scopes := strings.Fields(cfg.Scopes)
	if len(scopes) == 0 {
		scopes = []string{"email", "profile"}
	}
	scopes = s.ensureOpenIDScope(scopes)

	oauth2Config := oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  s.config.GetOidcRedirectURI(),
		Scopes:       scopes,
	}

	oldToken := &oauth2.Token{
		RefreshToken: refreshToken,
	}

	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	tokenSource := oauth2Config.TokenSource(providerCtx, oldToken)

	newToken, err := tokenSource.Token()
	if err != nil {
		slog.Error("RefreshToken: token refresh failed", "error", err)
		return nil, fmt.Errorf("failed to refresh access token: %w", err)
	}

	tokenType := newToken.TokenType
	if tokenType == "" {
		tokenType = "Bearer"
	}

	var rawIDToken string
	if idTokenValue := newToken.Extra("id_token"); idTokenValue != nil {
		if idTokenStr, ok := idTokenValue.(string); ok {
			rawIDToken = idTokenStr
		}
	}

	tokenResp := &dto.OidcTokenResponse{
		AccessToken:  newToken.AccessToken,
		TokenType:    tokenType,
		RefreshToken: newToken.RefreshToken,
		IDToken:      rawIDToken,
	}

	if !newToken.Expiry.IsZero() {
		expiresIn := int(time.Until(newToken.Expiry).Seconds())
		if expiresIn < 0 {
			expiresIn = 0
		}
		tokenResp.ExpiresIn = expiresIn
	}

	if tokenResp.RefreshToken == "" {
		tokenResp.RefreshToken = refreshToken
		slog.Debug("RefreshToken: no new refresh token issued, reusing existing")
	}

	slog.Info("RefreshToken: token refresh successful", "has_new_refresh_token", newToken.RefreshToken != "")
	return tokenResp, nil
}

func (s *OidcService) decodeState(encodedState string) (*OidcState, error) {
	stateJSON, err := base64.URLEncoding.DecodeString(encodedState)
	if err != nil {
		slog.Error("decodeState: failed to decode base64 state", "error", err)
		return nil, err
	}

	var stateData OidcState
	if err := json.Unmarshal(stateJSON, &stateData); err != nil {
		slog.Error("decodeState: failed to unmarshal state JSON", "error", err)
		return nil, err
	}

	return &stateData, nil
}
