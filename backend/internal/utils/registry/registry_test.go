package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestCheckAuthParsesRealmAndService(t *testing.T) {
	t.Parallel()
	realm := "https://auth.example/token"
	service := "example.org"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/" {
			w.Header().Set("WwW-Authenticate", `Bearer realm="`+realm+`",service="`+service+`"`)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient()
	got, err := c.CheckAuth(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	exp := realm + "?service=" + service
	if got != exp {
		t.Fatalf("got %q want %q", got, exp)
	}
}

func TestGetTokenMultiScopes(t *testing.T) {
	t.Parallel()
	var scopes []string
	var service string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		scopes = r.Form["scope"]
		service = r.Form.Get("service")
		_ = json.NewEncoder(w).Encode(map[string]string{"token": "t123"})
	}))
	defer srv.Close()

	u, _ := url.Parse(srv.URL)
	authURL := fmt.Sprintf("%s/auth?service=test.local", u.String())

	c := NewClient()
	tok, err := c.GetTokenMulti(context.Background(), authURL, []string{"library/a", "library/b"}, nil)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if tok != "t123" {
		t.Fatalf("token %q", tok)
	}
	if len(scopes) != 2 {
		t.Fatalf("scopes %v", scopes)
	}
	if service != "test.local" {
		t.Fatalf("service %q", service)
	}
}

func TestGetLatestDigestLowerCaseHeader(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodHead {
			t.Fatalf("expected HEAD, got %s", r.Method)
		}
		w.Header().Set("docker-content-digest", "sha256:feedface")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient()
	d, err := c.GetLatestDigest(context.Background(), srv.URL, "org/repo", "latest", "")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if d != "sha256:feedface" {
		t.Fatalf("digest %q", d)
	}
}

func TestGetImageTagsPagination(t *testing.T) {
	t.Parallel()
	var server *httptest.Server
	type tagsResp struct {
		Tags []string `json:"tags"`
	}
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/v2/org/repo/tags/list" && (r.URL.RawQuery == "" || r.URL.RawQuery == "page=1"):
			page2 := server.URL + "/v2/org/repo/tags/list?page=2"
			w.Header().Set("Link", `<`+page2+`>; rel="next"`)
			if err := json.NewEncoder(w).Encode(tagsResp{Tags: []string{"a", "b"}}); err != nil {
				http.Error(w, "encode error: "+err.Error(), http.StatusInternalServerError)
			}
		case r.URL.Path == "/v2/org/repo/tags/list" && r.URL.RawQuery == "page=2":
			if err := json.NewEncoder(w).Encode(tagsResp{Tags: []string{"c"}}); err != nil {
				http.Error(w, "encode error: "+err.Error(), http.StatusInternalServerError)
			}
		default:
			http.NotFound(w, r)
		}
	})
	server = httptest.NewServer(handler)
	defer server.Close()

	c := NewClient()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tags, err := c.GetImageTags(ctx, server.URL, "org/repo", "")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if strings.Join(tags, ",") != "a,b,c" {
		t.Fatalf("tags %v", tags)
	}
}
