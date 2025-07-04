package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/models"
)

// Common errors
var (
	ErrInvalidCredentials     = errors.New("invalid credentials")
	ErrUserNotFound           = errors.New("user not found")
	ErrInvalidToken           = errors.New("invalid token")
	ErrExpiredToken           = errors.New("token expired")
	ErrLocalAuthDisabled      = errors.New("local authentication is disabled")
	ErrOidcAuthDisabled       = errors.New("OIDC authentication is disabled")
	ErrPasswordChangeRequired = errors.New("password change required")
)

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

// OidcUserInfo contains user information from OIDC provider
type OidcUserInfo struct {
	Subject    string `json:"sub"`
	Name       string `json:"name,omitempty"`
	Email      string `json:"email,omitempty"`
	GivenName  string `json:"given_name,omitempty"`
	FamilyName string `json:"family_name,omitempty"`
}

// AuthSettings represents the auth configuration structure
type AuthSettings struct {
	LocalAuthEnabled bool               `json:"localAuthEnabled"`
	OidcEnabled      bool               `json:"oidcEnabled"`
	SessionTimeout   int                `json:"sessionTimeout"`
	Oidc             *models.OidcConfig `json:"oidc,omitempty"`
}

// OidcStatusInfo provides detailed OIDC configuration status
type OidcStatusInfo struct {
	EnvForced             bool `json:"envForced"`
	EnvConfigured         bool `json:"envConfigured"`
	DbEnabled             bool `json:"dbEnabled"`
	DbConfigured          bool `json:"dbConfigured"`
	EffectivelyEnabled    bool `json:"effectivelyEnabled"`
	EffectivelyConfigured bool `json:"effectivelyConfigured"`
}

type UserClaims struct {
	jwt.RegisteredClaims
	UserID      string   `json:"user_id"`
	Username    string   `json:"username"`
	Email       string   `json:"email,omitempty"`
	DisplayName string   `json:"display_name,omitempty"`
	Roles       []string `json:"roles"`
}

// AuthService handles authentication related operations
type AuthService struct {
	userService     *UserService
	settingsService *SettingsService
	jwtSecret       []byte
	accessExpiry    time.Duration
	refreshExpiry   time.Duration
	config          *config.Config
}

// NewAuthService creates a new auth service instance
func NewAuthService(userService *UserService, settingsService *SettingsService, jwtSecret string, cfg *config.Config) *AuthService {
	var secretBytes []byte
	if jwtSecret != "" {
		secretBytes = []byte(jwtSecret)
	} else {
		secretBytes = make([]byte, 32)
		if _, err := rand.Read(secretBytes); err != nil {
			panic(fmt.Errorf("failed to generate random JWT secret: %w", err))
		}
	}

	return &AuthService{
		userService:     userService,
		settingsService: settingsService,
		jwtSecret:       secretBytes,
		accessExpiry:    30 * time.Minute,
		refreshExpiry:   7 * 24 * time.Hour,
		config:          cfg,
	}
}

func (s *AuthService) SyncOidcEnvToDatabase(ctx context.Context) error {
	if !s.config.OidcEnabled {
		return errors.New("OIDC sync called but OIDC_ENABLED is false")
	}

	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get settings for OIDC sync: %w", err)
	}

	var currentAuthMap map[string]interface{}
	if len(settings.Auth) > 0 {
		currentAuthMap = make(map[string]interface{})
		for k, v := range settings.Auth {
			currentAuthMap[k] = v
		}
	} else {
		currentAuthMap = make(map[string]interface{})
	}

	envOidcConfig := models.OidcConfig{
		ClientID:              s.config.OidcClientID,
		ClientSecret:          s.config.OidcClientSecret,
		RedirectURI:           s.config.OidcRedirectURI,
		AuthorizationEndpoint: s.config.OidcAuthorizationEndpoint,
		TokenEndpoint:         s.config.OidcTokenEndpoint,
		UserinfoEndpoint:      s.config.OidcUserinfoEndpoint,
		Scopes:                s.config.OidcScopes,
	}

	oidcConfigBytes, err := json.Marshal(envOidcConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal OIDC config from env: %w", err)
	}
	var oidcConfigMap map[string]interface{}
	if err := json.Unmarshal(oidcConfigBytes, &oidcConfigMap); err != nil {
		return fmt.Errorf("failed to unmarshal OIDC config map from env: %w", err)
	}

	// Update the auth map
	currentAuthMap["oidcEnabled"] = true
	currentAuthMap["oidc"] = oidcConfigMap

	settings.Auth = models.JSON(currentAuthMap)

	_, err = s.settingsService.UpdateSettings(ctx, settings)
	if err != nil {
		return fmt.Errorf("failed to update settings in DB with OIDC env config: %w", err)
	}

	if s.config.OidcClientID == "" || s.config.OidcRedirectURI == "" || s.config.OidcAuthorizationEndpoint == "" || s.config.OidcTokenEndpoint == "" {
		log.Println("⚠️ Warning: Synced OIDC settings from environment, but one or more critical OIDC environment variables (ClientID, RedirectURI, AuthEndpoint, TokenEndpoint) were empty. OIDC may not function correctly.")
	}

	return nil
}

func (s *AuthService) getAuthSettings(ctx context.Context) (*AuthSettings, error) {
	dbSettings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	var effectiveAuthSettings AuthSettings
	if len(dbSettings.Auth) > 0 {
		authBytes, err := json.Marshal(dbSettings.Auth)
		if err != nil {
			log.Printf("Error marshalling auth settings from DB: %v. DB Auth: %v", err, dbSettings.Auth)
			return nil, fmt.Errorf("failed to marshal auth settings from DB: %w. Value: %v", err, dbSettings.Auth)
		}
		if err := json.Unmarshal(authBytes, &effectiveAuthSettings); err != nil {
			log.Printf("Error unmarshalling auth settings from DB: %v. DB Auth JSON: %s", err, string(authBytes))
			return nil, fmt.Errorf("failed to unmarshal auth settings from DB: %w. JSON: %s", err, string(authBytes))
		}
	} else {
		log.Println("Auth settings not found or empty in DB, returning default auth settings.")
		return &AuthSettings{
			LocalAuthEnabled: true,
			OidcEnabled:      false,
			SessionTimeout:   60,
			Oidc:             nil,
		}, nil
	}

	if s.config.OidcEnabled && !effectiveAuthSettings.OidcEnabled {
		log.Printf("Warning: PUBLIC_OIDC_ENABLED is true, but effective OIDC settings from DB show oidcEnabled=false. This might indicate an issue with the initial sync or subsequent manual changes.")
	}

	return &effectiveAuthSettings, nil
}

func (s *AuthService) GetOidcConfigurationStatus(ctx context.Context) (*OidcStatusInfo, error) {
	status := &OidcStatusInfo{}

	status.EnvForced = s.config.OidcEnabled
	if status.EnvForced {
		// This reflects if the env vars themselves were complete at load time
		status.EnvConfigured = s.config.OidcClientID != "" &&
			// s.config.OidcClientSecret != "" && // ClientSecret might be optional for "configured" status display
			s.config.OidcRedirectURI != "" &&
			s.config.OidcAuthorizationEndpoint != "" &&
			s.config.OidcTokenEndpoint != "" &&
			s.config.OidcUserinfoEndpoint != ""
	}

	// Get effective settings which are now purely from the database
	effectiveAuthSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		// If we can't get settings, we can't determine DB/effective status
		return status, fmt.Errorf("failed to get effective auth settings for OIDC status: %w", err)
	}

	status.DbEnabled = effectiveAuthSettings.OidcEnabled
	if effectiveAuthSettings.Oidc != nil {
		status.DbConfigured = effectiveAuthSettings.Oidc.ClientID != "" &&
			effectiveAuthSettings.Oidc.RedirectURI != "" &&
			effectiveAuthSettings.Oidc.AuthorizationEndpoint != "" &&
			effectiveAuthSettings.Oidc.TokenEndpoint != "" &&
			effectiveAuthSettings.Oidc.UserinfoEndpoint != ""
	}

	status.EffectivelyEnabled = status.DbEnabled
	status.EffectivelyConfigured = status.DbConfigured

	return status, nil
}

// updateAuthSettings updates the auth settings in the database
func (s *AuthService) updateAuthSettings(ctx context.Context, authSettings *AuthSettings) error {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return err
	}

	// Convert AuthSettings struct to map[string]interface{}
	authBytes, err := json.Marshal(authSettings)
	if err != nil {
		return fmt.Errorf("failed to marshal auth settings: %w", err)
	}

	var authMap map[string]interface{}
	if err := json.Unmarshal(authBytes, &authMap); err != nil {
		return fmt.Errorf("failed to unmarshal to map: %w", err)
	}

	settings.Auth = models.JSON(authMap)
	_, err = s.settingsService.UpdateSettings(ctx, settings)
	return err
}

// GetSessionTimeout returns the configured session timeout in minutes
func (s *AuthService) GetSessionTimeout(ctx context.Context) (int, error) {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return 1440, err
	}

	if authSettings.SessionTimeout <= 0 {
		return 1440, nil
	}

	return authSettings.SessionTimeout, nil
}

// UpdateSessionTimeout updates the session timeout in the auth settings
func (s *AuthService) UpdateSessionTimeout(ctx context.Context, minutes int) error {
	if minutes <= 0 {
		return errors.New("session timeout must be positive")
	}

	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return err
	}

	authSettings.SessionTimeout = minutes
	return s.updateAuthSettings(ctx, authSettings)
}

// IsLocalAuthEnabled checks if local authentication is enabled
func (s *AuthService) IsLocalAuthEnabled(ctx context.Context) (bool, error) {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return false, err
	}

	return authSettings.LocalAuthEnabled, nil
}

// IsOidcEnabled checks if OIDC authentication is enabled
func (s *AuthService) IsOidcEnabled(ctx context.Context) (bool, error) {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return false, err
	}

	return authSettings.OidcEnabled, nil
}

// GetOidcConfig retrieves the OIDC configuration
func (s *AuthService) GetOidcConfig(ctx context.Context) (*models.OidcConfig, error) {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return nil, err
	}

	if !authSettings.OidcEnabled || authSettings.Oidc == nil {
		return nil, ErrOidcAuthDisabled
	}

	return authSettings.Oidc, nil
}

// SetLocalAuthEnabled enables or disables local authentication
func (s *AuthService) SetLocalAuthEnabled(ctx context.Context, enabled bool) error {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return err
	}

	authSettings.LocalAuthEnabled = enabled
	return s.updateAuthSettings(ctx, authSettings)
}

// SetOidcEnabled enables or disables OIDC authentication
func (s *AuthService) SetOidcEnabled(ctx context.Context, enabled bool) error {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return err
	}

	authSettings.OidcEnabled = enabled
	return s.updateAuthSettings(ctx, authSettings)
}

// UpdateOidcConfig updates the OIDC configuration
func (s *AuthService) UpdateOidcConfig(ctx context.Context, oidcConfig *models.OidcConfig) error {
	authSettings, err := s.getAuthSettings(ctx)
	if err != nil {
		return err
	}

	authSettings.Oidc = oidcConfig
	return s.updateAuthSettings(ctx, authSettings)
}

// Login authenticates a user with username and password
func (s *AuthService) Login(ctx context.Context, username, password string) (*models.User, *TokenPair, error) {
	localEnabled, err := s.IsLocalAuthEnabled(ctx)
	if err != nil {
		return nil, nil, err
	}

	if !localEnabled {
		return nil, nil, ErrLocalAuthDisabled
	}

	user, err := s.userService.GetUserByUsername(ctx, username)
	if err != nil {
		if strings.Contains(err.Error(), "user not found") {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}

	if err := s.userService.ValidatePassword(user.PasswordHash, password); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	// Check if password needs upgrade from bcrypt to Argon2
	if s.userService.NeedsPasswordUpgrade(user.PasswordHash) {
		if err := s.userService.UpgradePasswordHash(ctx, user.ID, password); err != nil {
			// Log the error but don't fail the login
			fmt.Printf("Warning: Failed to upgrade password hash for user %s: %v\n", user.ID, err)
		} else {
			fmt.Printf("Successfully upgraded password hash for user %s from bcrypt to Argon2\n", user.Username)
		}
	}

	if user.RequirePasswordChange {
		return user, nil, ErrPasswordChangeRequired
	}

	now := time.Now()
	user.LastLogin = &now
	if _, err := s.userService.UpdateUser(ctx, user); err != nil {
		fmt.Printf("Failed to update user's last login time: %v\n", err)
	}

	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return user, tokenPair, nil
}

// OidcLogin authenticates or creates a user from OIDC provider info
func (s *AuthService) OidcLogin(ctx context.Context, userInfo OidcUserInfo) (*models.User, *TokenPair, error) {
	oidcEnabled, err := s.IsOidcEnabled(ctx)
	if err != nil {
		return nil, nil, err
	}

	if !oidcEnabled {
		return nil, nil, ErrOidcAuthDisabled
	}

	if userInfo.Subject == "" {
		return nil, nil, errors.New("missing OIDC subject identifier")
	}

	user, err := s.userService.GetUserByOidcSubjectId(ctx, userInfo.Subject)

	if err != nil && !errors.Is(err, ErrUserNotFound) {
		return nil, nil, err
	}

	if user != nil {
		if userInfo.Name != "" && user.DisplayName == nil {
			user.DisplayName = &userInfo.Name
		}
		if userInfo.Email != "" && user.Email == nil {
			user.Email = &userInfo.Email
		}

		now := time.Now()
		user.LastLogin = &now

		if _, err := s.userService.UpdateUser(ctx, user); err != nil {
			return nil, nil, err
		}
	} else {
		username := generateUsernameFromEmail(userInfo.Email, userInfo.Subject)

		var displayName string
		switch {
		case userInfo.Name != "":
			displayName = userInfo.Name
		case userInfo.GivenName != "" || userInfo.FamilyName != "":
			displayName = strings.TrimSpace(fmt.Sprintf("%s %s", userInfo.GivenName, userInfo.FamilyName))
		default:
			displayName = username
		}

		email := userInfo.Email

		user = &models.User{
			ID:            generateUserId(),
			Username:      username,
			DisplayName:   &displayName,
			Email:         &email,
			Roles:         models.StringSlice{"user"},
			OidcSubjectId: &userInfo.Subject,
		}

		if _, err := s.userService.CreateUser(ctx, user); err != nil {
			return nil, nil, err
		}
	}

	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return user, tokenPair, nil
}

// RefreshToken generates a new token pair from a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*TokenPair, error) {
	token, err := jwt.ParseWithClaims(refreshToken, &jwt.RegisteredClaims{},
		func(t *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})

	if err != nil {
		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	if claims.Subject != "refresh" {
		return nil, errors.New("not a refresh token")
	}

	userId := claims.ID
	if userId == "" {
		return nil, errors.New("missing user ID in token")
	}

	user, err := s.userService.GetUserByID(ctx, userId)
	if err != nil {
		return nil, err
	}

	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, err
	}

	return tokenPair, nil
}

// VerifyToken verifies and returns the user from an access token
func (s *AuthService) VerifyToken(ctx context.Context, accessToken string) (*models.User, error) {
	token, err := jwt.ParseWithClaims(accessToken, &UserClaims{},
		func(t *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})

	if err != nil {
		if strings.Contains(err.Error(), "token is expired") {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	if claims.Subject != "access" {
		return nil, errors.New("not an access token")
	}

	user := &models.User{
		ID:       claims.UserID,
		Username: claims.Username,
		Roles:    models.StringSlice(claims.Roles),
	}

	if claims.Email != "" {
		user.Email = &claims.Email
	}

	if claims.DisplayName != "" {
		user.DisplayName = &claims.DisplayName
	}

	return user, nil
}

// ChangePassword changes a user's password
func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	user, err := s.userService.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.PasswordHash != "" {
		if err := s.userService.ValidatePassword(user.PasswordHash, currentPassword); err != nil {
			return ErrInvalidCredentials
		}
	}

	hashedPassword, err := s.userService.hashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	user.PasswordHash = hashedPassword
	user.RequirePasswordChange = false
	_, err = s.userService.UpdateUser(ctx, user)
	return err
}

// RequestPasswordReset initiates password reset (placeholder)
func (s *AuthService) RequestPasswordReset(ctx context.Context, username string) error {
	return errors.New("password reset not implemented")
}

// Helper functions

// generateTokenPair creates an access and refresh token pair for a user
func (s *AuthService) generateTokenPair(ctx context.Context, user *models.User) (*TokenPair, error) {
	sessionTimeout, err := s.GetSessionTimeout(ctx)
	if err != nil {
		sessionTimeout = 1440
	}

	accessTokenExpiry := time.Now().Add(time.Duration(sessionTimeout) * time.Minute)

	userClaims := UserClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        user.ID,
			Subject:   "access",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(accessTokenExpiry),
		},
		UserID:   user.ID,
		Username: user.Username,
		Roles:    []string(user.Roles),
	}

	if user.Email != nil {
		userClaims.Email = *user.Email
	}

	if user.DisplayName != nil {
		userClaims.DisplayName = *user.DisplayName
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, userClaims)

	accessTokenString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		ID:        user.ID,
		Subject:   "refresh",
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.refreshExpiry)),
	})

	refreshTokenString, err := refreshToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresAt:    accessTokenExpiry,
	}, nil
}

// generateUserId creates a unique user ID
func generateUserId() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return fmt.Sprintf("usr_%s", base64.RawURLEncoding.EncodeToString(b))
}

// generateUsernameFromEmail creates a username from email or fallback to subject
func generateUsernameFromEmail(email, subject string) string {
	if email != "" {
		parts := strings.Split(email, "@")
		if len(parts) > 0 && parts[0] != "" {
			return parts[0]
		}
	}

	if len(subject) >= 8 {
		return "user_" + subject[len(subject)-8:]
	}
	return "user_" + subject
}
