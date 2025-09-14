package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
)

func newTestOidcService() *OidcService {
	return &OidcService{
		authService: nil,              // not used in these tests
		config:      &config.Config{}, // redirect URI may be empty; that's fine for these unit tests
		httpClient:  &http.Client{},   // overridden per-test with server.Client()
	}
}

func TestDiscoverOidcEndpoints_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if err := json.NewEncoder(w).Encode(dto.OidcDiscoveryDocument{
			AuthorizationEndpoint: "https://example/authorize",
			TokenEndpoint:         "https://example/token",
			UserinfoEndpoint:      "https://example/userinfo",
			JwksURI:               "https://example/jwks",
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	doc, err := svc.discoverOidcEndpoints(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("discoverOidcEndpoints: %v", err)
	}
	if doc.AuthorizationEndpoint == "" || doc.TokenEndpoint == "" || doc.UserinfoEndpoint == "" || doc.JwksURI == "" {
		t.Fatalf("unexpected discovery doc: %+v", doc)
	}
}

func TestDiscoverOidcEndpoints_NonJSON(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte("not json")); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	_, err := svc.discoverOidcEndpoints(context.Background(), srv.URL)
	if err == nil || !strings.Contains(err.Error(), "non-JSON") {
		t.Fatalf("expected non-JSON error, got %v", err)
	}
}

func TestDiscoverOidcEndpoints_HTTPError(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusBadGateway)
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	_, err := svc.discoverOidcEndpoints(context.Background(), srv.URL)
	if err == nil || !strings.Contains(err.Error(), "returned 502") {
		t.Fatalf("expected status error, got %v", err)
	}
}

func TestDiscoverOidcEndpoints_MissingEndpoints(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte(`{"authorization_endpoint":"https://example/auth"}`)); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	_, err := svc.discoverOidcEndpoints(context.Background(), srv.URL)
	if err == nil || !strings.Contains(err.Error(), "missing required endpoints") {
		t.Fatalf("expected missing endpoints error, got %v", err)
	}
}

func TestExchangeCodeForTokens_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "bad form", http.StatusBadRequest)
			return
		}
		if r.Form.Get("grant_type") != "authorization_code" || r.Form.Get("code") != "abc123" {
			http.Error(w, "invalid grant", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(dto.OidcTokenResponse{
			AccessToken:  "access-1",
			RefreshToken: "refresh-1",
			ExpiresIn:    3600,
			IDToken:      "id-1",
			TokenType:    "Bearer",
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	cfg := &models.OidcConfig{
		TokenEndpoint: srv.URL + "/token",
		ClientID:      "client",
		ClientSecret:  "secret",
	}
	tok, err := svc.exchangeCodeForTokens(context.Background(), cfg, "abc123", "verifier")
	if err != nil {
		t.Fatalf("exchangeCodeForTokens: %v", err)
	}
	if tok.AccessToken != "access-1" || tok.RefreshToken != "refresh-1" || tok.TokenType != "Bearer" {
		t.Fatalf("unexpected token response: %+v", tok)
	}
}

func TestExchangeCodeForTokens_Non200(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "bad", http.StatusBadRequest)
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	cfg := &models.OidcConfig{TokenEndpoint: srv.URL + "/token"}
	_, err := svc.exchangeCodeForTokens(context.Background(), cfg, "x", "y")
	if err == nil || !strings.Contains(err.Error(), "returned 400") {
		t.Fatalf("expected 400 error, got %v", err)
	}
}

func TestGetUserInfo_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); !strings.HasPrefix(got, "Bearer ") {
			http.Error(w, "no bearer", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		const body = `{
            "sub": "user-1",
            "name": "Alice",
            "email": "a@example.com",
            "preferred_username": "alice",
            "given_name": "Alice",
            "family_name": "A",
            "admin": true,
            "roles": ["admin","user"],
            "groups": ["devs","ops"]
        }`
		if _, err := w.Write([]byte(body)); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	cfg := &models.OidcConfig{UserinfoEndpoint: srv.URL + "/userinfo"}
	ui, err := svc.getUserInfo(context.Background(), cfg, "token-123")
	if err != nil {
		t.Fatalf("getUserInfo: %v", err)
	}
	if ui.Subject != "user-1" || ui.Email != "a@example.com" || !ui.Admin {
		t.Fatalf("unexpected user info: %+v", ui)
	}
	if len(ui.Roles) != 2 || ui.Roles[0] != "admin" {
		t.Fatalf("roles not parsed: %+v", ui.Roles)
	}
	if len(ui.Groups) != 2 || ui.Groups[1] != "ops" {
		t.Fatalf("groups not parsed: %+v", ui.Groups)
	}
}

func TestGetUserInfo_MissingSub(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if _, err := w.Write([]byte(`{"email":"x@example.com"}`)); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	cfg := &models.OidcConfig{UserinfoEndpoint: srv.URL + "/userinfo"}
	_, err := svc.getUserInfo(context.Background(), cfg, "t")
	if err == nil || !strings.Contains(err.Error(), "missing required 'sub'") {
		t.Fatalf("expected missing sub error, got %v", err)
	}
}

func TestGetUserInfo_Non200(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "nope", http.StatusUnauthorized)
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()

	cfg := &models.OidcConfig{UserinfoEndpoint: srv.URL + "/userinfo"}
	_, err := svc.getUserInfo(context.Background(), cfg, "t")
	if err == nil || !strings.Contains(err.Error(), "returned 401") {
		t.Fatalf("expected 401 error, got %v", err)
	}
}

func TestDecodeState_Success(t *testing.T) {
	now := time.Now().Round(time.Second)
	state := OidcState{
		State:        "s123",
		CodeVerifier: "v456",
		RedirectTo:   "/home",
		CreatedAt:    now,
	}
	raw, err := json.Marshal(state)
	if err != nil {
		t.Fatalf("json.Marshal(state): %v", err)
	}
	enc := base64.URLEncoding.EncodeToString(raw)

	svc := newTestOidcService()
	got, err := svc.decodeState(enc)
	if err != nil {
		t.Fatalf("decodeState: %v", err)
	}
	if got.State != "s123" || got.CodeVerifier != "v456" || got.RedirectTo != "/home" || got.CreatedAt.IsZero() {
		t.Fatalf("unexpected decoded state: %+v", got)
	}
}

func TestDecodeState_InvalidBase64(t *testing.T) {
	svc := newTestOidcService()
	_, err := svc.decodeState("###not-base64###")
	if err == nil {
		t.Fatalf("expected base64 error")
	}
}

func TestHandleCallback_StateMismatch(t *testing.T) {
	stored := OidcState{
		State:        "good",
		CodeVerifier: "cv",
		RedirectTo:   "/",
		CreatedAt:    time.Now(),
	}
	raw, err := json.Marshal(stored)
	if err != nil {
		t.Fatalf("json.Marshal(stored): %v", err)
	}
	enc := base64.URLEncoding.EncodeToString(raw)

	svc := newTestOidcService()
	_, _, err = svc.HandleCallback(context.Background(), "code", "bad", enc)
	if err == nil || !strings.Contains(err.Error(), "invalid state parameter") {
		t.Fatalf("expected invalid state error, got %v", err)
	}
}

func TestHandleCallback_ExpiredState(t *testing.T) {
	stored := OidcState{
		State:        "s",
		CodeVerifier: "cv",
		RedirectTo:   "/",
		CreatedAt:    time.Now().Add(-11 * time.Minute),
	}
	raw, err := json.Marshal(stored)
	if err != nil {
		t.Fatalf("json.Marshal(stored): %v", err)
	}
	enc := base64.URLEncoding.EncodeToString(raw)

	svc := newTestOidcService()
	_, _, err = svc.HandleCallback(context.Background(), "code", "s", enc)
	if err == nil || !strings.Contains(err.Error(), "state has expired") {
		t.Fatalf("expected expired state error, got %v", err)
	}
}

// Helper to ensure form bodies are parsed as expected (optional smoke test)
func TestTokenEndpoint_FormShape(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		if ct := r.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
			http.Error(w, "bad content-type", http.StatusUnsupportedMediaType)
			return
		}
		body, _ := url.ParseQuery(readAll(t, r))
		if body.Get("grant_type") == "" {
			http.Error(w, "missing grant_type", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if _, err := w.Write([]byte(`{"access_token":"a","token_type":"Bearer","expires_in":1,"refresh_token":"r"}`)); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := newTestOidcService()
	svc.httpClient = srv.Client()
	cfg := &models.OidcConfig{TokenEndpoint: srv.URL + "/token"}

	if _, err := svc.exchangeCodeForTokens(context.Background(), cfg, "c", "v"); err != nil {
		t.Fatalf("exchangeCodeForTokens: %v", err)
	}
}
func readAll(t *testing.T, r *http.Request) string {
	t.Helper()
	defer r.Body.Close()
	b := new(strings.Builder)
	_, _ = io.Copy(b, r.Body)
	return b.String()
}
