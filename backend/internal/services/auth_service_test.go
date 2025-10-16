package services

import (
	"context"
	"crypto/rand"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
)

func newTestAuthService(secret string) *AuthService {
	if secret == "" {
		b := make([]byte, 32)
		if _, err := rand.Read(b); err != nil {
			panic(err)
		}
		return &AuthService{
			jwtSecret:     b,
			refreshExpiry: 24 * time.Hour,
			config:        &config.Config{},
		}
	}
	return &AuthService{
		jwtSecret:     []byte(secret),
		refreshExpiry: 24 * time.Hour,
		config:        &config.Config{},
	}
}

func makeAccessToken(t *testing.T, secret []byte, subject string, id string, username string, roles []string, email, displayName string, exp time.Time) string {
	t.Helper()
	claims := UserClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        id,
			Subject:   subject,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
		UserID:      id,
		Username:    username,
		Roles:       roles,
		Email:       email,
		DisplayName: displayName,
		AppVersion:  config.Version,
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(secret)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return signed
}

func TestVerifyToken_ValidClaims(t *testing.T) {
	s := newTestAuthService("")
	exp := time.Now().Add(5 * time.Minute)
	token := makeAccessToken(t, s.jwtSecret, "access", "u123", "alice", []string{"user", "admin"}, "a@example.com", "Alice", exp)

	user, err := s.VerifyToken(context.Background(), token)
	if err != nil {
		t.Fatalf("VerifyToken error: %v", err)
	}
	if user.ID != "u123" {
		t.Errorf("id %q", user.ID)
	}
	if user.Username != "alice" {
		t.Errorf("username %q", user.Username)
	}
	if len(user.Roles) != 2 || user.Roles[0] != "user" || user.Roles[1] != "admin" {
		t.Errorf("roles %v", user.Roles)
	}
	if user.Email == nil || *user.Email != "a@example.com" {
		t.Errorf("email %v", user.Email)
	}
	if user.DisplayName == nil || *user.DisplayName != "Alice" {
		t.Errorf("displayName %v", user.DisplayName)
	}
}

func TestVerifyToken_Expired(t *testing.T) {
	s := newTestAuthService("")
	exp := time.Now().Add(-1 * time.Minute)
	token := makeAccessToken(t, s.jwtSecret, "access", "u1", "bob", []string{"user"}, "", "", exp)

	_, err := s.VerifyToken(context.Background(), token)
	if !errors.Is(err, ErrExpiredToken) {
		t.Errorf("want ErrExpiredToken, got %v", err)
	}
}

func TestVerifyToken_InvalidSubject(t *testing.T) {
	s := newTestAuthService("")
	exp := time.Now().Add(5 * time.Minute)
	token := makeAccessToken(t, s.jwtSecret, "refresh", "u1", "bob", []string{"user"}, "", "", exp)

	_, err := s.VerifyToken(context.Background(), token)
	if err == nil || err.Error() != "not an access token" {
		t.Errorf("want 'not an access token', got %v", err)
	}
}

func TestVerifyToken_InvalidSignature(t *testing.T) {
	s := newTestAuthService("")
	exp := time.Now().Add(5 * time.Minute)
	otherSecret := make([]byte, 32)
	if _, err := rand.Read(otherSecret); err != nil {
		t.Fatalf("rand.Read: %v", err)
	}
	token := makeAccessToken(t, otherSecret, "access", "u1", "bob", []string{"user"}, "", "", exp)

	_, err := s.VerifyToken(context.Background(), token)
	if !errors.Is(err, ErrInvalidToken) {
		t.Errorf("want ErrInvalidToken, got %v", err)
	}
}

func TestVerifyToken_MissingUserID(t *testing.T) {
	s := newTestAuthService("")
	exp := time.Now().Add(5 * time.Minute)
	token := makeAccessToken(t, s.jwtSecret, "access", "", "bob", []string{"user"}, "", "", exp)

	_, err := s.VerifyToken(context.Background(), token)
	if err == nil || err.Error() != "missing user ID in token" {
		t.Errorf("want 'missing user ID in token', got %v", err)
	}
}

func TestGenerateUsernameFromEmail(t *testing.T) {
	u := generateUsernameFromEmail("john.doe@example.com", "sub-abcdef01")
	if u != "john.doe" {
		t.Errorf("username %q", u)
	}
	u2 := generateUsernameFromEmail("", "1234567890abcdef")
	if u2 != "user_90abcdef" {
		t.Errorf("fallback username %q", u2)
	}
	u3 := generateUsernameFromEmail("", "short")
	if u3 != "user_short" {
		t.Errorf("short subject username %q", u3)
	}
}

func TestPersistOidcTokens_SetsFields(t *testing.T) {
	s := newTestAuthService("")
	user := &models.User{}
	start := time.Now()
	resp := &dto.OidcTokenResponse{
		AccessToken:  "at-123",
		RefreshToken: "rt-456",
		ExpiresIn:    7,
		IDToken:      "",
	}
	s.persistOidcTokens(user, resp)

	if user.OidcAccessToken == nil || *user.OidcAccessToken != "at-123" {
		t.Errorf("access token %v", user.OidcAccessToken)
	}
	if user.OidcRefreshToken == nil || *user.OidcRefreshToken != "rt-456" {
		t.Errorf("refresh token %v", user.OidcRefreshToken)
	}
	if user.OidcAccessTokenExpiresAt == nil {
		t.Errorf("expiresAt nil")
	}
	// Check approx expiry within [start+7s, start+12s] to allow CI slop
	min := start.Add(7 * time.Second)
	max := start.Add(12 * time.Second)
	if user.OidcAccessTokenExpiresAt.Before(min) || user.OidcAccessTokenExpiresAt.After(max) {
		t.Errorf("expiresAt %v not in [%v,%v]", user.OidcAccessTokenExpiresAt, min, max)
	}
}

func TestVerifyToken_VersionMismatch(t *testing.T) {
	s := newTestAuthService("")
	exp := time.Now().Add(5 * time.Minute)

	oldVersion := config.Version
	config.Version = "1.0.0"
	token := makeAccessToken(t, s.jwtSecret, "access", "u1", "bob", []string{"user"}, "", "", exp)
	config.Version = "2.0.0"

	_, err := s.VerifyToken(context.Background(), token)
	if !errors.Is(err, ErrTokenVersionMismatch) {
		t.Errorf("want ErrTokenVersionMismatch, got %v", err)
	}

	config.Version = oldVersion
}

func TestGetOidcConfigurationStatus(t *testing.T) {
	// Disabled
	s := newTestAuthService("")
	s.config = &config.Config{}
	status, err := s.GetOidcConfigurationStatus(context.Background())
	if err != nil {
		t.Fatalf("GetOidcConfigurationStatus error: %v", err)
	}
	if status.EnvForced || status.EnvConfigured {
		t.Errorf("expected disabled, got forced=%v configured=%v", status.EnvForced, status.EnvConfigured)
	}

	// Enabled but missing fields
	s.config.OidcEnabled = true
	status, err = s.GetOidcConfigurationStatus(context.Background())
	if err != nil {
		t.Fatalf("GetOidcConfigurationStatus error: %v", err)
	}
	if !status.EnvForced || status.EnvConfigured {
		t.Errorf("expected enabled but not configured, got forced=%v configured=%v", status.EnvForced, status.EnvConfigured)
	}

	// Enabled and configured
	s.config.OidcClientID = "client-id"
	s.config.OidcIssuerURL = "https://example.com"
	status, err = s.GetOidcConfigurationStatus(context.Background())
	if err != nil {
		t.Fatalf("GetOidcConfigurationStatus error: %v", err)
	}
	if !status.EnvForced || !status.EnvConfigured {
		t.Errorf("expected enabled and configured, got forced=%v configured=%v", status.EnvForced, status.EnvConfigured)
	}
}
