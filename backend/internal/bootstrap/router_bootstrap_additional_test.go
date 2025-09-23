package bootstrap

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
)

func withGinMode(t *testing.T, mode string, fn func()) {
	t.Helper()
	orig := gin.Mode()
	gin.SetMode(mode)
	defer gin.SetMode(orig)
	fn()
}

// findRoute checks whether a method+path pair exists in gin.Engine.Routes()
func findRoute(r *gin.Engine, method, path string) bool {
	for _, ri := range r.Routes() {
		if ri.Method == method && ri.Path == path {
			return true
		}
	}
	return false
}

// routeWithPrefixExists helps to detect any route starting with a prefix (useful when exact path is unknown)
func routeWithPrefixExists(r *gin.Engine, method, prefix string) bool {
	for _, ri := range r.Routes() {
		if ri.Method == method && strings.HasPrefix(ri.Path, prefix) {
			return true
		}
	}
	return false
}

// minimalCfg returns a Config with overridable fields.
func minimalCfg(env string, agent bool) *config.Config {
	return &config.Config{
		Environment: env,
		AgentMode:   agent,
	}
}

// minimalServices returns a zero-value Services; tests only assert route registration,
// handlers won't be executed, so zero/empty services are fine unless constructors panic.
func minimalServices() *Services {
	return &Services{}
}

func TestSetupRouter_SetsGinModeByEnvironment(t *testing.T) {
	// production -> ReleaseMode
	withGinMode(t, gin.DebugMode, func() {
		cfg := minimalCfg("production", true)
		r := setupRouter(cfg, minimalServices())
		if r == nil {
			t.Fatal("expected router, got nil")
		}
		if got := gin.Mode(); got \!= gin.ReleaseMode {
			t.Fatalf("expected gin mode %q, got %q", gin.ReleaseMode, got)
		}
	})

	// non-production -> DebugMode
	withGinMode(t, gin.ReleaseMode, func() {
		cfg := minimalCfg("development", true)
		r := setupRouter(cfg, minimalServices())
		if r == nil {
			t.Fatal("expected router, got nil")
		}
		if got := gin.Mode(); got \!= gin.DebugMode {
			t.Fatalf("expected gin mode %q, got %q", gin.DebugMode, got)
		}
	})
}

func TestSetupRouter_RegistersHealthRoutes(t *testing.T) {
	// In both agent and non-agent modes, health endpoint should be present
	for _, tc := range []struct {
		name      string
		agentMode bool
	}{
		{"agent-mode", true},
		{"normal-mode", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Avoid potential frontend side effects by using agent mode OR discarding DefaultErrorWriter.
			cfg := minimalCfg("test", tc.agentMode)

			// Silence any frontend registration errors printed by gin.
			origErr := gin.DefaultErrorWriter
			defer func() { gin.DefaultErrorWriter = origErr }()
			gin.DefaultErrorWriter = io.Discard

			r := setupRouter(cfg, minimalServices())
			if r == nil {
				t.Fatal("expected router, got nil")
			}

			// Assert that HEAD/GET /api/health routes exist (exact or at least prefix /api/health).
			exists := findRoute(r, http.MethodGet, "/api/health") || routeWithPrefixExists(r, http.MethodGet, "/api/health")
			if \!exists {
				t.Fatalf("expected GET /api/health route to be registered")
			}
			existsHead := findRoute(r, http.MethodHead, "/api/health") || routeWithPrefixExists(r, http.MethodHead, "/api/health")
			if \!existsHead {
				t.Fatalf("expected HEAD /api/health route to be registered")
			}
		})
	}
}

func TestSetupRouter_AgentModeSkipsFrontendAndMostAPI(t *testing.T) {
	// In agent mode, many user-facing routes like /api/version should not be present,
	// while /api/system (registered in agent mode path) should exist.
	cfg := minimalCfg("test", true)

	// Silence frontend writer just in case (though agent mode returns early).
	origErr := gin.DefaultErrorWriter
	defer func() { gin.DefaultErrorWriter = origErr }()
	gin.DefaultErrorWriter = io.Discard

	r := setupRouter(cfg, minimalServices())

	// Expect health present
	if \!routeWithPrefixExists(r, http.MethodGet, "/api/health") {
		t.Fatalf("expected /api/health route to exist in agent mode")
	}

	// Expect system present (registered in agent path)
	if \!(routeWithPrefixExists(r, http.MethodGet, "/api/system") ||
		routeWithPrefixExists(r, http.MethodHead, "/api/system")) {
		t.Fatalf("expected /api/system route to exist in agent mode")
	}

	// Expect version absent in agent mode
	if routeWithPrefixExists(r, http.MethodGet, "/api/version") {
		t.Fatalf("did not expect /api/version route in agent mode")
	}
}

func TestSetupRouter_NonProductionRegistersPlaywrightHooks(t *testing.T) {
	// Arrange a sentinel playwright route registration
	called := false
	register := func(apiGroup *gin.RouterGroup, _ *Services) {
		called = true
		apiGroup.GET("/test-playwright-sentinel", func(c *gin.Context) { c.Status(http.StatusTeapot) })
	}

	// Inject into global slice and restore after test
	orig := slices.Clone(registerPlaywrightRoutes)
	registerPlaywrightRoutes = append(registerPlaywrightRoutes, register)
	defer func() { registerPlaywrightRoutes = orig }()

	// Non-production, non-agent to pass through PW registration branch
	cfg := minimalCfg("development", false)

	// Silence potential frontend messages
	origErr := gin.DefaultErrorWriter
	defer func() { gin.DefaultErrorWriter = origErr }()
	gin.DefaultErrorWriter = io.Discard

	r := setupRouter(cfg, minimalServices())

	if \!called {
		t.Fatalf("expected playwright registration function to be called")
	}

	// Assert sentinel route is registered and responds
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/test-playwright-sentinel", nil)
	r.ServeHTTP(w, req)
	if w.Code \!= http.StatusTeapot {
		t.Fatalf("expected status 418 from sentinel route, got %d", w.Code)
	}
}

func TestSetupRouter_ProductionSkipsPlaywrightHooks(t *testing.T) {
	// Arrange a register function that would panic if called
	register := func(apiGroup *gin.RouterGroup, _ *Services) {
		apiGroup.GET("/should-not-exist", func(c *gin.Context) { c.Status(http.StatusOK) })
		panic("playwright registration should not be invoked in production")
	}

	orig := slices.Clone(registerPlaywrightRoutes)
	registerPlaywrightRoutes = append(registerPlaywrightRoutes, register)
	defer func() { registerPlaywrightRoutes = orig }()

	cfg := minimalCfg("production", false)

	// Silence potential frontend messages
	origErr := gin.DefaultErrorWriter
	defer func() { gin.DefaultErrorWriter = origErr }()
	gin.DefaultErrorWriter = io.Discard

	// If registration is wrongly invoked, the panic will fail the test
	r := setupRouter(cfg, minimalServices())

	// Ensure route not present
	if routeWithPrefixExists(r, http.MethodGet, "/api/should-not-exist") {
		t.Fatalf("playwright route should not be registered in production")
	}
}

func TestSetupRouter_CORSPreflightOnHealth_AllowsOptions(t *testing.T) {
	// We validate that CORS middleware is present by issuing an OPTIONS preflight
	// to a known route prefix (/api/health). We only assert presence of some CORS headers,
	// without assuming a specific value.
	cfg := minimalCfg("test", true)

	// Silence any frontend messages (shouldn't hit in agent mode)
	origErr := gin.DefaultErrorWriter
	defer func() { gin.DefaultErrorWriter = origErr }()
	gin.DefaultErrorWriter = io.Discard

	r := setupRouter(cfg, minimalServices())

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/api/health", nil)
	req.Header.Set("Origin", "http://example.com")
	req.Header.Set("Access-Control-Request-Method", "GET")

	r.ServeHTTP(w, req)

	if w.Code < 200 || w.Code >= 400 {
		t.Fatalf("expected successful CORS preflight (2xx/3xx), got %d", w.Code)
	}

	// Check for presence of typical CORS headers
	// We don't enforce exact values to avoid coupling to config defaults.
	corsHeaders := []string{
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Methods",
		"Access-Control-Allow-Headers",
	}
	missing := []string{}
	for _, h := range corsHeaders {
		if _, ok := w.Header()[h]; \!ok {
			missing = append(missing, h)
		}
	}
	if len(missing) > 0 {
		t.Fatalf("expected CORS headers to be present, missing: %v", missing)
	}
}

func TestSetupRouter_HealthEndpoint_Responds(t *testing.T) {
	// Smoke test GET and HEAD to health endpoint path regardless of exact sub-path pattern.
	cfg := minimalCfg("test", true)

	origErr := gin.DefaultErrorWriter
	defer func() { gin.DefaultErrorWriter = origErr }()
	gin.DefaultErrorWriter = io.Discard

	r := setupRouter(cfg, minimalServices())

	// Try GET /api/health
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
		r.ServeHTTP(w, req)
		if w.Code == http.StatusNotFound {
			t.Fatalf("GET /api/health should not be 404")
		}
	}

	// Try HEAD /api/health
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodHead, "/api/health", bytes.NewReader(nil))
		r.ServeHTTP(w, req)
		if w.Code == http.StatusNotFound {
			t.Fatalf("HEAD /api/health should not be 404")
		}
	}
}