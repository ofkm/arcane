package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ofkm/arcane-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
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

// AuthService handles authentication related operations
type AuthService struct {
	userService     *UserService
	settingsService *SettingsService
	jwtSecret       []byte
	accessExpiry    time.Duration // How long access tokens are valid
	refreshExpiry   time.Duration // How long refresh tokens are valid
}

// NewAuthService creates a new auth service instance
func NewAuthService(userService *UserService, settingsService *SettingsService, jwtSecret string) *AuthService {
	// Use provided JWT secret or generate a secure random one
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
		accessExpiry:    30 * time.Minute,   // Default: 30 minutes
		refreshExpiry:   7 * 24 * time.Hour, // Default: 7 days
	}
}

// getAuthSettings retrieves and parses auth settings from the settings service
func (s *AuthService) getAuthSettings(ctx context.Context) (*AuthSettings, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	// Convert models.JSON to []byte and then unmarshal to our struct
	authBytes, err := json.Marshal(settings.Auth)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal auth settings: %w", err)
	}

	var authSettings AuthSettings
	if err := json.Unmarshal(authBytes, &authSettings); err != nil {
		return nil, fmt.Errorf("failed to unmarshal auth settings: %w", err)
	}

	return &authSettings, nil
}

// updateAuthSettings updates the auth settings in the database
func (s *AuthService) updateAuthSettings(ctx context.Context, authSettings *AuthSettings) error {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return err
	}

	// Convert back to models.JSON
	authMap := make(map[string]interface{})
	authBytes, err := json.Marshal(authSettings)
	if err != nil {
		return fmt.Errorf("failed to marshal auth settings: %w", err)
	}

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
		return 1440, err // Default to 24 hours (1440 minutes) on error
	}

	if authSettings.SessionTimeout <= 0 {
		return 1440, nil // Default value
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
	// Check if local auth is enabled
	localEnabled, err := s.IsLocalAuthEnabled(ctx)
	if err != nil {
		return nil, nil, err
	}

	if !localEnabled {
		return nil, nil, ErrLocalAuthDisabled
	}

	// Get user by username - FIXED: this should match the UserService method signature
	user, err := s.userService.GetUserByUsername(ctx, username)
	if err != nil {
		if strings.Contains(err.Error(), "user not found") {
			return nil, nil, ErrInvalidCredentials // Use generic error for security
		}
		return nil, nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	// Check if password change is required
	if user.RequirePasswordChange {
		return user, nil, ErrPasswordChangeRequired
	}

	// Update last login time
	now := time.Now()
	user.LastLogin = &now
	if _, err := s.userService.UpdateUser(ctx, user); err != nil {
		// Non-critical error, log but continue
		fmt.Printf("Failed to update user's last login time: %v\n", err)
	}

	// Generate token pair
	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return user, tokenPair, nil
}

// OidcLogin authenticates or creates a user from OIDC provider info
func (s *AuthService) OidcLogin(ctx context.Context, userInfo OidcUserInfo) (*models.User, *TokenPair, error) {
	// Check if OIDC auth is enabled
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

	// Try to find existing user by OIDC subject ID
	user, err := s.userService.GetUserByOidcSubjectId(ctx, userInfo.Subject)

	if err != nil && err != ErrUserNotFound {
		return nil, nil, err
	}

	// If user exists, update their information
	if user != nil {
		// Update fields conditionally if provided by OIDC
		if userInfo.Name != "" && user.DisplayName == nil {
			user.DisplayName = &userInfo.Name
		}
		if userInfo.Email != "" && user.Email == nil {
			user.Email = &userInfo.Email
		}

		// Update last login time
		now := time.Now()
		user.LastLogin = &now

		if _, err := s.userService.UpdateUser(ctx, user); err != nil {
			return nil, nil, err
		}
	} else {
		// Create new user with OIDC information
		username := generateUsernameFromEmail(userInfo.Email, userInfo.Subject)

		// Create display name from OIDC claims
		var displayName string
		if userInfo.Name != "" {
			displayName = userInfo.Name
		} else if userInfo.GivenName != "" || userInfo.FamilyName != "" {
			displayName = strings.TrimSpace(fmt.Sprintf("%s %s", userInfo.GivenName, userInfo.FamilyName))
		} else {
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

	// Generate token pair
	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return user, tokenPair, nil
}

// RefreshToken generates a new token pair from a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*TokenPair, error) {
	// Parse refresh token
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

	// Get claims
	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	// Check token type is "refresh"
	if claims.Subject != "refresh" {
		return nil, errors.New("not a refresh token")
	}

	// Get user ID from token
	userId := claims.ID
	if userId == "" {
		return nil, errors.New("missing user ID in token")
	}

	// Get user
	user, err := s.userService.GetUserByID(ctx, userId)
	if err != nil {
		return nil, err
	}

	// Generate new token pair
	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, err
	}

	return tokenPair, nil
}

// VerifyToken verifies and returns the user from an access token
func (s *AuthService) VerifyToken(ctx context.Context, accessToken string) (*models.User, error) {
	// Parse access token
	token, err := jwt.ParseWithClaims(accessToken, &jwt.RegisteredClaims{},
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

	// Get claims
	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	// Check token type is "access"
	if claims.Subject != "access" {
		return nil, errors.New("not an access token")
	}

	// Get user ID from token
	userId := claims.ID
	if userId == "" {
		return nil, errors.New("missing user ID in token")
	}

	// Get user
	user, err := s.userService.GetUserByID(ctx, userId)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// ChangePassword changes a user's password
func (s *AuthService) ChangePassword(ctx context.Context, userId, currentPassword, newPassword string) error {
	// Get user
	user, err := s.userService.GetUserByID(ctx, userId)
	if err != nil {
		return err
	}

	// Verify current password if provided
	if currentPassword != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
			return ErrInvalidCredentials
		}
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update user
	user.PasswordHash = string(hashedPassword)
	user.RequirePasswordChange = false

	_, err = s.userService.UpdateUser(ctx, user)
	return err
}

// RequestPasswordReset initiates password reset (placeholder)
func (s *AuthService) RequestPasswordReset(ctx context.Context, username string) error {
	// TODO: Implement password reset functionality
	return errors.New("password reset not implemented")
}

// Helper functions

// generateTokenPair creates an access and refresh token pair for a user
func (s *AuthService) generateTokenPair(ctx context.Context, user *models.User) (*TokenPair, error) {
	// Get session timeout from settings
	sessionTimeout, err := s.GetSessionTimeout(ctx)
	if err != nil {
		// Use default if there's an error
		sessionTimeout = 1440 // 24 hours in minutes
	}

	// Access token with shorter expiry
	accessTokenExpiry := time.Now().Add(time.Duration(sessionTimeout) * time.Minute)

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		ID:        user.ID, // Use user ID as token ID
		Subject:   "access",
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(accessTokenExpiry),
	})

	accessTokenString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	// Refresh token with longer expiry
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		ID:        user.ID, // Use user ID as token ID
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
	// Generate 16 random bytes
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		panic(err) // This should never happen
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

	// Fallback to using part of the subject
	if len(subject) >= 8 {
		return "user_" + subject[len(subject)-8:]
	}
	return "user_" + subject
}
