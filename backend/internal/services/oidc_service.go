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

	"log/slog"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

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

func (s *OidcService) getEffectiveConfig(ctx context.Context) (*models.OidcConfig, error) {
	config, err := s.authService.GetOidcConfig(ctx)
	if err != nil {
		return nil, err
	}
	if config.IssuerURL == "" {
		return nil, errors.New("either issuerUrl or explicit endpoints must be configured")
	}
	return config, nil
}

func (s *OidcService) GenerateAuthURL(ctx context.Context, redirectTo string) (string, string, error) {
	config, err := s.getEffectiveConfig(ctx)
	if err != nil {
		slog.Error("GenerateAuthURL: failed to get OIDC config", "error", err)
		return "", "", err
	}

	// Use provider discovery via go-oidc
	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	provider, err := oidc.NewProvider(providerCtx, config.IssuerURL)
	if err != nil {
		slog.Error("GenerateAuthURL: provider discovery failed", "issuer", config.IssuerURL, "error", err)
		return "", "", fmt.Errorf("failed to discover provider: %w", err)
	}

	state := utils.GenerateRandomString(32)
	codeVerifier := utils.GenerateRandomString(128)
	codeChallenge := utils.GenerateCodeChallenge(codeVerifier)

	scopes := strings.Fields(config.Scopes)
	if len(scopes) == 0 {
		scopes = []string{oidc.ScopeOpenID, "email", "profile"}
	}

	oauth2Config := oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  s.config.GetOidcRedirectURI(),
		Scopes:       scopes,
	}

	authURL := oauth2Config.AuthCodeURL(state,
		oauth2.SetAuthURLParam("code_challenge", codeChallenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	)

	stateData := OidcState{
		State:        state,
		CodeVerifier: codeVerifier,
		RedirectTo:   redirectTo,
		CreatedAt:    time.Now(),
	}

	stateJSON, err := json.Marshal(stateData)
	if err != nil {
		slog.Error("GenerateAuthURL: failed to marshal state", "error", err)
		return "", "", err
	}
	encodedState := base64.URLEncoding.EncodeToString(stateJSON)

	return authURL, encodedState, nil
}

func (s *OidcService) discoverProvider(ctx context.Context, issuer string) (*oidc.Provider, error) {
	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	provider, err := oidc.NewProvider(providerCtx, issuer)
	if err != nil {
		slog.Error("discoverProvider: discovery failed", "issuer", issuer, "error", err)
		return nil, fmt.Errorf("failed to discover provider: %w", err)
	}
	return provider, nil
}

func (s *OidcService) exchangeToken(ctx context.Context, cfg *models.OidcConfig, provider *oidc.Provider, code string, verifier string) (*oauth2.Token, error) {
	oauth2Config := oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  s.config.GetOidcRedirectURI(),
		Scopes:       strings.Fields(cfg.Scopes),
	}
	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	token, err := oauth2Config.Exchange(providerCtx, code, oauth2.SetAuthURLParam("code_verifier", verifier))
	if err != nil {
		slog.Error("exchangeToken: token exchange failed", "token_endpoint", oauth2Config.Endpoint.TokenURL, "error", err)
		return nil, fmt.Errorf("failed to exchange code for tokens: %w", err)
	}
	return token, nil
}

func (s *OidcService) fetchClaims(ctx context.Context, provider *oidc.Provider, token *oauth2.Token, idToken *oidc.IDToken, cfg *models.OidcConfig) (map[string]any, error) {
	providerCtx := oidc.ClientContext(ctx, s.httpClient)
	var rawClaims map[string]any

	userInfo, uerr := provider.UserInfo(providerCtx, oauth2.StaticTokenSource(token))
	if uerr == nil && userInfo != nil {
		if cerr := userInfo.Claims(&rawClaims); cerr == nil {
			slog.Debug("fetchClaims: userinfo claims fetched")
			return rawClaims, nil
		} else {
			slog.Debug("fetchClaims: userinfo claims decode failed", "error", cerr)
		}
	} else if uerr != nil {
		slog.Debug("fetchClaims: userinfo endpoint call failed", "error", uerr)
	}

	if idToken != nil {
		if err := idToken.Claims(&rawClaims); err != nil {
			slog.Debug("fetchClaims: id_token claims decode failed", "error", err)
		}
		slog.Debug("fetchClaims: claims extracted from id_token")
		return rawClaims, nil

	}

	wellKnown := strings.TrimSuffix(cfg.IssuerURL, "/") + "/.well-known/openid-configuration"
	req, rerr := http.NewRequestWithContext(providerCtx, http.MethodGet, wellKnown, nil)
	if rerr != nil {
		slog.Debug("fetchClaims: well-known request creation failed", "error", rerr)
		return nil, errors.New("no claims available")
	}
	req.Header.Set("Accept", "application/json")
	resp, derr := s.httpClient.Do(req)
	if derr != nil || resp == nil {
		if derr != nil {
			slog.Debug("fetchClaims: discovery request failed", "error", derr)
		}
		return nil, errors.New("no claims available")
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	var disco dto.OidcDiscoveryDocument
	if json.Unmarshal(body, &disco) == nil && disco.UserinfoEndpoint != "" {
		slog.Debug("fetchClaims: discovered userinfo endpoint", "userinfo_endpoint", disco.UserinfoEndpoint)
		req2, _ := http.NewRequestWithContext(providerCtx, http.MethodGet, disco.UserinfoEndpoint, nil)
		req2.Header.Set("Authorization", "Bearer "+token.AccessToken)
		req2.Header.Set("Accept", "application/json")
		if resp2, err2 := s.httpClient.Do(req2); err2 == nil && resp2 != nil {
			var tmp map[string]any
			if json.NewDecoder(resp2.Body).Decode(&tmp) == nil {
				resp2.Body.Close()
				slog.Debug("fetchClaims: direct userinfo endpoint returned claims")
				return tmp, nil
			}
			resp2.Body.Close()
			slog.Debug("fetchClaims: direct userinfo decode failed")
		} else if err2 != nil {
			slog.Debug("fetchClaims: direct userinfo request failed", "error", err2)
		}
	}

	return nil, errors.New("no claims available")
}

func (s *OidcService) HandleCallback(ctx context.Context, code, state, storedState string) (*dto.OidcUserInfo, *dto.OidcTokenResponse, error) {
	slog.Debug("HandleCallback: start", "code_len", len(code), "state_len", len(state))

	stateData, err := s.decodeState(storedState)
	if err != nil {
		slog.Error("HandleCallback: failed to decode stored state", "error", err)
		return nil, nil, fmt.Errorf("failed to decode state: %w", err)
	}

	if state != stateData.State {
		slog.Error("HandleCallback: invalid state parameter", "received", state, "expected_len", len(stateData.State))
		return nil, nil, errors.New("invalid state parameter")
	}

	if time.Since(stateData.CreatedAt) > 10*time.Minute {
		slog.Error("HandleCallback: state expired", "created_at", stateData.CreatedAt)
		return nil, nil, errors.New("state has expired")
	}

	cfg, err := s.getEffectiveConfig(ctx)
	if err != nil {
		slog.Error("HandleCallback: failed to get effective config", "error", err)
		return nil, nil, err
	}

	provider, err := s.discoverProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, nil, err
	}

	token, err := s.exchangeToken(ctx, cfg, provider, code, stateData.CodeVerifier)
	if err != nil {
		return nil, nil, err
	}

	var rawIDToken string
	if t := token.Extra("id_token"); t != nil {
		if sID, ok := t.(string); ok {
			rawIDToken = sID
		}
	}

	var idToken *oidc.IDToken
	if rawIDToken != "" {
		verifier := provider.Verifier(&oidc.Config{ClientID: cfg.ClientID})
		idToken, err = verifier.Verify(oidc.ClientContext(ctx, s.httpClient), rawIDToken)
		if err != nil {
			slog.Error("HandleCallback: id_token verification failed", "error", err)
			return nil, nil, fmt.Errorf("failed to verify id_token: %w", err)
		}
		slog.Debug("HandleCallback: id_token verified", "id_token_len", len(rawIDToken))
	} else {
		slog.Debug("HandleCallback: no id_token present in token response")
	}

	rawClaims, cerr := s.fetchClaims(ctx, provider, token, idToken, cfg)
	if cerr != nil {
		slog.Debug("HandleCallback: fetchClaims returned no claims", "error", cerr)
		rawClaims = map[string]any{}
	}

	userInfoDto := dto.OidcUserInfo{
		Subject:           utils.GetStringClaim(rawClaims, "sub"),
		Name:              utils.GetStringClaim(rawClaims, "name"),
		Email:             utils.GetStringClaim(rawClaims, "email"),
		PreferredUsername: utils.GetStringClaim(rawClaims, "preferred_username"),
		GivenName:         utils.GetStringClaim(rawClaims, "given_name"),
		FamilyName:        utils.GetStringClaim(rawClaims, "family_name"),
		Admin:             utils.GetBoolClaim(rawClaims, "admin"),
		Roles:             utils.GetStringSliceClaim(rawClaims, "roles"),
		Groups:            utils.GetStringSliceClaim(rawClaims, "groups"),
		Extra:             rawClaims,
	}

	if userInfoDto.Subject == "" {
		slog.Error("HandleCallback: missing 'sub' claim after all attempts", "claims_empty", len(rawClaims) == 0)
		return nil, nil, errors.New("missing required 'sub' field in userinfo/claims")
	}

	tokenResp := &dto.OidcTokenResponse{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		IDToken:      rawIDToken,
	}
	if !token.Expiry.IsZero() {
		tokenResp.ExpiresIn = int(time.Until(token.Expiry).Seconds())
	}

	slog.Debug("HandleCallback: completed successfully", "subject", userInfoDto.Subject)

	return &userInfoDto, tokenResp, nil
}

func (s *OidcService) RefreshToken(ctx context.Context, refreshToken string) (*dto.OidcTokenResponse, error) {
	cfg, err := s.getEffectiveConfig(ctx)
	if err != nil {
		slog.Error("RefreshToken: failed to get effective config", "error", err)
		return nil, err
	}

	// Use oauth2 token refresh via token endpoint
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("client_id", cfg.ClientID)
	data.Set("client_secret", cfg.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		slog.Error("RefreshToken: failed to create request", "error", err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		slog.Error("RefreshToken: token endpoint request failed", "token_endpoint", cfg.TokenEndpoint, "error", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		slog.Error("RefreshToken: token endpoint returned non-200", "status", resp.StatusCode, "body", string(bodyBytes))
		return nil, fmt.Errorf("token endpoint returned %d on refresh: %s", resp.StatusCode, string(bodyBytes))
	}

	var tokenResponse dto.OidcTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		slog.Error("RefreshToken: failed to decode token response", "error", err)
		return nil, err
	}
	slog.Debug("RefreshToken: refresh successful", "has_refresh_token", tokenResponse.RefreshToken != "")
	return &tokenResponse, nil
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
