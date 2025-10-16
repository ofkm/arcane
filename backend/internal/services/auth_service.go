package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

var (
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrUserNotFound         = errors.New("user not found")
	ErrInvalidToken         = errors.New("invalid token")
	ErrExpiredToken         = errors.New("token expired")
	ErrTokenVersionMismatch = errors.New("token version mismatch")
	ErrLocalAuthDisabled    = errors.New("local authentication is disabled")
	ErrOidcAuthDisabled     = errors.New("OIDC authentication is disabled")
)

type TokenPair struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type AuthSettings struct {
	LocalAuthEnabled bool               `json:"localAuthEnabled"`
	OidcEnabled      bool               `json:"oidcEnabled"`
	SessionTimeout   int                `json:"sessionTimeout"`
	Oidc             *models.OidcConfig `json:"oidc,omitempty"`
}

type UserClaims struct {
	jwt.RegisteredClaims
	UserID      string   `json:"user_id"`
	Username    string   `json:"username"`
	Email       string   `json:"email,omitempty"`
	DisplayName string   `json:"display_name,omitempty"`
	Roles       []string `json:"roles"`
	AppVersion  string   `json:"app_version,omitempty"`
}

type AuthService struct {
	userService     *UserService
	settingsService *SettingsService
	eventService    *EventService
	jwtSecret       []byte
	refreshExpiry   time.Duration
	config          *config.Config
}

func NewAuthService(userService *UserService, settingsService *SettingsService, eventService *EventService, jwtSecret string, cfg *config.Config) *AuthService {
	return &AuthService{
		userService:     userService,
		settingsService: settingsService,
		eventService:    eventService,
		jwtSecret:       utils.CheckOrGenerateJwtSecret(jwtSecret),
		refreshExpiry:   7 * 24 * time.Hour,
		config:          cfg,
	}
}

func (s *AuthService) getAuthSettings(ctx context.Context) (*AuthSettings, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	timeoutMinutes, _ := s.GetSessionTimeout(ctx)

	authSettings := &AuthSettings{
		LocalAuthEnabled: settings.AuthLocalEnabled.IsTrue(),
		OidcEnabled:      settings.AuthOidcEnabled.IsTrue(),
		SessionTimeout:   timeoutMinutes,
	}

	if authSettings.OidcEnabled && settings.AuthOidcConfig.Value != "" {
		var oidcConfig models.OidcConfig
		if err := json.Unmarshal([]byte(settings.AuthOidcConfig.Value), &oidcConfig); err == nil {
			authSettings.Oidc = &oidcConfig
		}
	}

	return authSettings, nil
}

func (s *AuthService) GetOidcConfigurationStatus(ctx context.Context) (*dto.OidcStatusInfo, error) {
	status := &dto.OidcStatusInfo{
		EnvForced: s.config.OidcEnabled,
	}
	if s.config.OidcEnabled {
		status.EnvConfigured = s.config.OidcClientID != "" && s.config.OidcIssuerURL != ""
	}
	return status, nil
}

func (s *AuthService) GetSessionTimeout(ctx context.Context) (int, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return 60, err
	}

	minutes := settings.AuthSessionTimeout.AsInt()
	if minutes <= 0 {
		minutes = 60
	}

	if minutes < 15 {
		minutes = 15
	} else if minutes > 1440 {
		minutes = 1440
	}

	return minutes, nil
}

func (s *AuthService) IsLocalAuthEnabled(ctx context.Context) (bool, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return true, err
	}
	return settings.AuthLocalEnabled.IsTrue(), nil
}

func (s *AuthService) IsOidcEnabled(ctx context.Context) (bool, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return false, err
	}
	return settings.AuthOidcEnabled.IsTrue(), nil
}

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

	if s.userService.NeedsPasswordUpgrade(user.PasswordHash) {
		if err := s.userService.UpgradePasswordHash(ctx, user.ID, password); err != nil {
			fmt.Printf("Warning: Failed to upgrade password hash for user %s: %v\n", user.ID, err)
		} else {
			fmt.Printf("Successfully upgraded password hash for user %s from bcrypt to Argon2\n", user.Username)
		}
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

	metadata := models.JSON{
		"action": "login",
		"method": "local",
	}
	if logErr := s.eventService.LogUserEvent(ctx, models.EventTypeUserLogin, user.ID, user.Username, metadata); logErr != nil {
		fmt.Printf("Could not log user login action: %s\n", logErr)
	}

	return user, tokenPair, nil
}

func (s *AuthService) OidcLogin(ctx context.Context, userInfo dto.OidcUserInfo, tokenResp *dto.OidcTokenResponse) (*models.User, *TokenPair, error) {
	if userInfo.Subject == "" {
		return nil, nil, errors.New("missing OIDC subject identifier")
	}

	user, isNewUser, err := s.findOrCreateOidcUser(ctx, userInfo, tokenResp)
	if err != nil {
		return nil, nil, err
	}

	tokenPair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	metadata := models.JSON{
		"action":  "login",
		"method":  "oidc",
		"newUser": isNewUser,
		"subject": userInfo.Subject,
	}
	if logErr := s.eventService.LogUserEvent(ctx, models.EventTypeUserLogin, user.ID, user.Username, metadata); logErr != nil {
		fmt.Printf("Could not log OIDC user login action: %s\n", logErr)
	}

	return user, tokenPair, nil
}

func (s *AuthService) findOrCreateOidcUser(ctx context.Context, userInfo dto.OidcUserInfo, tokenResp *dto.OidcTokenResponse) (*models.User, bool, error) {
	user, err := s.userService.GetUserByOidcSubjectId(ctx, userInfo.Subject)
	if err != nil && !errors.Is(err, ErrUserNotFound) {
		return nil, false, err
	}

	if user == nil {
		created, err := s.createOidcUser(ctx, userInfo, tokenResp)
		if err != nil {
			return nil, false, err
		}
		return created, true, nil
	}

	if err := s.updateOidcUser(ctx, user, userInfo, tokenResp); err != nil {
		return nil, false, err
	}

	return user, false, nil
}

func (s *AuthService) createOidcUser(ctx context.Context, userInfo dto.OidcUserInfo, tokenResp *dto.OidcTokenResponse) (*models.User, error) {
	now := time.Now()

	var username string
	if userInfo.PreferredUsername == "" {
		username = generateUsernameFromEmail(userInfo.Email, userInfo.Subject)
	} else {
		username = userInfo.PreferredUsername
	}

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

	roles := models.StringSlice{"user"}
	if s.isAdminFromOidc(ctx, userInfo, tokenResp) {
		roles = append(roles, "admin")
	}

	user := &models.User{
		BaseModel:     models.BaseModel{ID: uuid.NewString()},
		Username:      username,
		DisplayName:   &displayName,
		Email:         &email,
		Roles:         roles,
		OidcSubjectId: &userInfo.Subject,
		LastLogin:     &now,
	}

	s.persistOidcTokens(user, tokenResp)

	if _, err := s.userService.CreateUser(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) updateOidcUser(ctx context.Context, user *models.User, userInfo dto.OidcUserInfo, tokenResp *dto.OidcTokenResponse) error {
	if userInfo.Name != "" && user.DisplayName == nil {
		user.DisplayName = &userInfo.Name
	}
	if userInfo.Email != "" && user.Email == nil {
		user.Email = &userInfo.Email
	}

	wantAdmin := s.isAdminFromOidc(ctx, userInfo, tokenResp)
	hasAdmin := hasRole(user.Roles, "admin")
	switch {
	case wantAdmin && !hasAdmin:
		user.Roles = addRole(user.Roles, "admin")
	case !wantAdmin && hasAdmin:
		user.Roles = removeRole(user.Roles, "admin")
	}

	s.persistOidcTokens(user, tokenResp)

	now := time.Now()
	user.LastLogin = &now
	_, err := s.userService.UpdateUser(ctx, user)
	return err
}

func hasRole(roles models.StringSlice, role string) bool {
	for _, r := range roles {
		if strings.EqualFold(r, role) {
			return true
		}
	}
	return false
}

func addRole(roles models.StringSlice, role string) models.StringSlice {
	if hasRole(roles, role) {
		return roles
	}
	return append(roles, role)
}

func removeRole(roles models.StringSlice, role string) models.StringSlice {
	out := make(models.StringSlice, 0, len(roles))
	for _, r := range roles {
		if !strings.EqualFold(r, role) {
			out = append(out, r)
		}
	}
	return out
}

func (s *AuthService) isAdminFromOidc(ctx context.Context, userInfo dto.OidcUserInfo, tokenResp *dto.OidcTokenResponse) bool {
	claimKey, values := s.getAdminClaimConfig(ctx)
	if claimKey == "" {
		return false
	}

	if v, ok := utils.GetByPath(userInfo.Extra, claimKey); ok && utils.EvalMatch(v, values) {
		return true
	}

	if tokenResp != nil && tokenResp.IDToken != "" {
		if claims := utils.ParseJWTClaims(tokenResp.IDToken); claims != nil {
			if v, ok := utils.GetByPath(claims, claimKey); ok && utils.EvalMatch(v, values) {
				return true
			}
		}
	}

	return false
}

func (s *AuthService) getAdminClaimConfig(ctx context.Context) (claim string, values []string) {
	as, err := s.getAuthSettings(ctx)
	if err != nil || as.Oidc == nil {
		return "", nil
	}
	claim = strings.TrimSpace(as.Oidc.AdminClaim)
	raw := strings.TrimSpace(as.Oidc.AdminValue)
	if claim == "" {
		return "", nil
	}
	if raw == "" {
		return claim, nil
	}
	parts := strings.Split(raw, ",")
	for _, p := range parts {
		v := strings.TrimSpace(p)
		if v != "" {
			values = append(values, v)
		}
	}
	return claim, values
}

func (s *AuthService) persistOidcTokens(user *models.User, tokenResp *dto.OidcTokenResponse) {
	if tokenResp == nil {
		return
	}
	if tokenResp.AccessToken != "" {
		user.OidcAccessToken = &tokenResp.AccessToken
	}
	if tokenResp.RefreshToken != "" {
		user.OidcRefreshToken = &tokenResp.RefreshToken
	}
	if tokenResp.ExpiresIn > 0 {
		expiresAt := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
		user.OidcAccessTokenExpiresAt = &expiresAt
	}
}

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

	if claims.ID == "" {
		return nil, errors.New("missing user ID in token")
	}

	if claims.AppVersion != "" && claims.AppVersion != config.Version {
		slog.InfoContext(ctx, "Token version mismatch detected",
			"tokenVersion", claims.AppVersion,
			"currentVersion", config.Version,
			"user", claims.Username)
		return nil, ErrTokenVersionMismatch
	}

	user := &models.User{
		BaseModel: models.BaseModel{ID: claims.ID},
		Username:  claims.Username,
		Roles:     models.StringSlice(claims.Roles),
	}

	if claims.Email != "" {
		user.Email = &claims.Email
	}

	if claims.DisplayName != "" {
		user.DisplayName = &claims.DisplayName
	}

	return user, nil
}

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
	_, err = s.userService.UpdateUser(ctx, user)
	return err
}

func (s *AuthService) generateTokenPair(ctx context.Context, user *models.User) (*TokenPair, error) {
	sessionTimeout, _ := s.GetSessionTimeout(ctx)

	accessTokenExpiry := time.Now().Add(time.Duration(sessionTimeout) * time.Minute)
	slog.WarnContext(ctx, "accessTokenExpiry", "expiry", accessTokenExpiry)

	userClaims := UserClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        user.ID,
			Subject:   "access",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(accessTokenExpiry),
		},
		UserID:     user.ID,
		Username:   user.Username,
		Roles:      []string(user.Roles),
		AppVersion: config.Version,
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
