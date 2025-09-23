package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

/*
Testing library/framework:
- Go's testing package
- github.com/stretchr/testify (require/assert), consistent with existing repo tests

Scope:
- Validation and routing/error paths that are independent of internal services wiring.
- Focus on recent handler code: PairAgent guard, local routing fallback, and strong request validation.
*/

func makeCtx(method, target string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var rdr *strings.Reader
	if body \!= "" {
		rdr = strings.NewReader(body)
	} else {
		rdr = strings.NewReader("")
	}
	req := httptest.NewRequest(method, target, rdr)
	if body \!= "" {
		req.Header.Set("Content-Type", "application/json")
	}
	c.Request = req
	return c, w
}

func TestPairAgent_NonLocalID_Returns404(t *testing.T) {
	h := &EnvironmentHandler{cfg: &config.Config{}}
	c, w := makeCtx(http.MethodPost, "/api/environments/123/agent/pair", "")
	c.Params = gin.Params{{Key: "id", Value: "123"}}

	h.PairAgent(c)

	require.Equal(t, http.StatusNotFound, w.Code)
	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, false, out["success"])
	data := out["data"].(map[string]any)
	assert.Equal(t, "Not found", data["error"])
}

func TestRouteRequest_LocalUnknownEndpoint_Returns404(t *testing.T) {
	h := &EnvironmentHandler{cfg: &config.Config{}}
	c, w := makeCtx(http.MethodGet, "/api/environments/0/unknown", "")
	c.Params = gin.Params{{Key: "id", Value: LOCAL_DOCKER_ENVIRONMENT_ID}}

	h.routeRequest(c, "/does-not-exist")

	require.Equal(t, http.StatusNotFound, w.Code)
	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, false, out["success"])
	data := out["data"].(map[string]any)
	assert.Equal(t, "Endpoint not found", data["error"])
}

func TestCreateEnvironment_BadJSON_Returns400(t *testing.T) {
	h := &EnvironmentHandler{cfg: &config.Config{}}
	c, w := makeCtx(http.MethodPost, "/api/environments", `{"apiUrl":`)

	h.CreateEnvironment(c)

	require.Equal(t, http.StatusBadRequest, w.Code)
	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, false, out["success"])
	data := out["data"].(map[string]any)
	// Error message starts with "Invalid request format: "
	errMsg := data["error"].(string)
	assert.True(t, strings.HasPrefix(errMsg, "Invalid request format: "))
}

func TestListEnvironments_InvalidQuery_Returns400(t *testing.T) {
	h := &EnvironmentHandler{cfg: &config.Config{}}
	// Provide non-integer values for pagination params to trigger binding error
	c, w := makeCtx(http.MethodGet, "/api/environments?page=abc&limit=xyz", "")

	h.ListEnvironments(c)

	require.Equal(t, http.StatusBadRequest, w.Code)
	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, false, out["success"])
	data := out["data"].(map[string]any)
	errMsg := data["error"].(string)
	assert.True(t, strings.HasPrefix(errMsg, "Invalid pagination or sort parameters: "))
}

func TestUpdateEnvironment_BadJSON_Returns400(t *testing.T) {
	h := &EnvironmentHandler{cfg: &config.Config{}}
	c, w := makeCtx(http.MethodPut, "/api/environments/123", `{"name":` )
	c.Params = gin.Params{{Key: "id", Value: "123"}}

	h.UpdateEnvironment(c)

	require.Equal(t, http.StatusBadRequest, w.Code)
	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, false, out["success"])
	data := out["data"].(map[string]any)
	assert.Equal(t, "Invalid request body", data["error"])
}