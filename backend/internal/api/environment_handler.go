package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

const LOCAL_DOCKER_ENVIRONMENT_ID = "0"

type EnvironmentHandler struct {
	environmentService *services.EnvironmentService
	settingsService    *services.SettingsService
	upgradeService     *services.SystemUpgradeService
	cfg                *config.Config
	httpClient         *http.Client
}

func NewEnvironmentHandler(
	group *gin.RouterGroup,
	environmentService *services.EnvironmentService,
	settingsService *services.SettingsService,
	upgradeService *services.SystemUpgradeService,
	authMiddleware *middleware.AuthMiddleware,
	cfg *config.Config,
) {
	h := &EnvironmentHandler{
		environmentService: environmentService,
		settingsService:    settingsService,
		upgradeService:     upgradeService,
		cfg:                cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	apiGroup := group.Group("/environments")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("", h.ListEnvironments)
		apiGroup.POST("", h.CreateEnvironment)
		apiGroup.GET("/:id", h.GetEnvironment)
		apiGroup.PUT("/:id", h.UpdateEnvironment)
		apiGroup.DELETE("/:id", h.DeleteEnvironment)
		apiGroup.POST("/:id/test", h.TestConnection)
		apiGroup.POST("/:id/heartbeat", h.UpdateHeartbeat)
		apiGroup.POST("/:id/agent/pair", h.PairAgent)
		
		// Environment upgrade endpoints (admin required)
		apiGroup.GET("/:id/upgrade/check", authMiddleware.WithAdminRequired().Add(), h.CheckEnvironmentUpgrade)
		apiGroup.POST("/:id/upgrade", authMiddleware.WithAdminRequired().Add(), h.TriggerEnvironmentUpgrade)
	}
}

func (h *EnvironmentHandler) PairAgent(c *gin.Context) {
	if c.Param("id") != LOCAL_DOCKER_ENVIRONMENT_ID {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Not found"}})
		return
	}
	type pairReq struct {
		Rotate *bool `json:"rotate,omitempty"`
	}
	var req pairReq
	_ = c.ShouldBindJSON(&req)

	if h.cfg.AgentToken == "" || (req.Rotate != nil && *req.Rotate) {
		h.cfg.AgentToken = utils.GenerateRandomString(48)
	}

	// Persist token on the agent so it survives restarts
	if err := h.settingsService.SetStringSetting(c.Request.Context(), "agentToken", h.cfg.AgentToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to persist agent token"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token": h.cfg.AgentToken,
		},
	})
}

// Create
func (h *EnvironmentHandler) CreateEnvironment(c *gin.Context) {
	var req dto.CreateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request format: " + err.Error()}})
		return
	}

	env := &models.Environment{
		ApiUrl:  req.ApiUrl,
		Enabled: true,
	}
	if req.Name != nil {
		env.Name = *req.Name
	}
	if req.Enabled != nil {
		env.Enabled = *req.Enabled
	}

	if (req.AccessToken == nil || *req.AccessToken == "") && req.BootstrapToken != nil && *req.BootstrapToken != "" {
		token, err := h.environmentService.PairAgentWithBootstrap(c.Request.Context(), req.ApiUrl, *req.BootstrapToken)
		if err != nil {
			slog.ErrorContext(c.Request.Context(), "Failed to pair with agent",
				slog.String("apiUrl", req.ApiUrl),
				slog.String("error", err.Error()))

			c.JSON(http.StatusBadGateway, gin.H{
				"success": false,
				"data": gin.H{
					"error": "Agent pairing failed: " + err.Error(),
					"hint":  "Ensure the agent is running and the bootstrap token matches AGENT_BOOTSTRAP_TOKEN",
				},
			})
			return
		}
		env.AccessToken = &token
	} else if req.AccessToken != nil && *req.AccessToken != "" {
		env.AccessToken = req.AccessToken
	}

	created, err := h.environmentService.CreateEnvironment(c.Request.Context(), env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to create environment: " + err.Error()}})
		return
	}

	out, mapErr := dto.MapOne[*models.Environment, dto.EnvironmentDto](created)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map environment"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": out})
}

func (h *EnvironmentHandler) ListEnvironments(c *gin.Context) {
	params := pagination.ExtractListModifiersQueryParams(c)

	envs, paginationResp, err := h.environmentService.ListEnvironmentsPaginated(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to fetch environments"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       envs,
		"pagination": paginationResp,
	})
}

// Get by ID
func (h *EnvironmentHandler) GetEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
		return
	}

	out, mapErr := dto.MapOne[*models.Environment, dto.EnvironmentDto](environment)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map environment"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

// Update
func (h *EnvironmentHandler) UpdateEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	var req dto.UpdateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request body"}})
		return
	}

	updates := map[string]interface{}{}
	if req.ApiUrl != nil {
		updates["api_url"] = *req.ApiUrl
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}

	// If caller asked to pair (bootstrapToken present) and no accessToken provided in the request,
	// resolve apiUrl (current or updated) and let the service pair and persist the token.
	if (req.AccessToken == nil) && req.BootstrapToken != nil && *req.BootstrapToken != "" {
		current, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
		if err != nil || current == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
			return
		}
		apiUrl := current.ApiUrl
		if req.ApiUrl != nil && *req.ApiUrl != "" {
			apiUrl = *req.ApiUrl
		}
		if _, err := h.environmentService.PairAndPersistAgentToken(c.Request.Context(), environmentID, apiUrl, *req.BootstrapToken); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Agent pairing failed: " + err.Error()}})
			return
		}
	} else if req.AccessToken != nil {
		updates["access_token"] = *req.AccessToken
	}

	updated, err := h.environmentService.UpdateEnvironment(c.Request.Context(), environmentID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to update environment"}})
		return
	}

	out, mapErr := dto.MapOne[*models.Environment, dto.EnvironmentDto](updated)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map environment"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

// Delete
func (h *EnvironmentHandler) DeleteEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.DeleteEnvironment(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to delete environment: " + err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Environment deleted successfully"},
	})
}

// TestConnection
func (h *EnvironmentHandler) TestConnection(c *gin.Context) {
	environmentID := c.Param("id")

	status, err := h.environmentService.TestConnection(c.Request.Context(), environmentID)
	resp := dto.TestConnectionDto{Status: status}
	if err != nil {
		msg := err.Error()
		resp.Message = &msg
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"data":    resp,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

func (h *EnvironmentHandler) UpdateHeartbeat(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.UpdateEnvironmentHeartbeat(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update heartbeat",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Heartbeat updated successfully",
	})
}

// CheckEnvironmentUpgrade checks if an environment can be upgraded
// For environment ID "0" (local), uses local upgrade service
// For remote environments, proxies the request to the remote agent
func (h *EnvironmentHandler) CheckEnvironmentUpgrade(c *gin.Context) {
	environmentID := c.Param("id")

	// Handle local environment (ID "0")
	if environmentID == LOCAL_DOCKER_ENVIRONMENT_ID {
		canUpgrade, err := h.upgradeService.CanUpgrade(c.Request.Context())

		response := gin.H{
			"canUpgrade": canUpgrade && err == nil,
		}

		if err != nil {
			response["error"] = true
			response["message"] = err.Error()
			slog.Debug("Local system upgrade check failed", "error", err)
		} else {
			response["error"] = false
			response["message"] = "System can be upgraded"
		}

		c.JSON(http.StatusOK, response)
		return
	}

	// Handle remote environment
	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Environment not found",
		})
		return
	}

	// Build URL for remote agent's upgrade check endpoint
	targetURL := strings.TrimRight(environment.ApiUrl, "/") + "/api/environments/0/system/upgrade/check"

	// Create request to remote agent
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create request: " + err.Error(),
		})
		return
	}

	// Add agent token if available
	if environment.AccessToken != nil && *environment.AccessToken != "" {
		req.Header.Set("X-Arcane-Agent-Token", *environment.AccessToken)
	}

	// Forward request to remote agent
	resp, err := h.httpClient.Do(req)
	if err != nil {
		slog.WarnContext(c.Request.Context(), "Failed to check upgrade on remote environment",
			"environmentId", environmentID,
			"error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success":    false,
			"error":      "Failed to connect to remote environment",
			"canUpgrade": false,
		})
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to read response from remote environment",
		})
		return
	}

	// Parse response
	var upgradeCheck map[string]interface{}
	if err := json.Unmarshal(body, &upgradeCheck); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to parse response from remote environment",
		})
		return
	}

	// Return the remote agent's response
	c.JSON(resp.StatusCode, upgradeCheck)
}

// TriggerEnvironmentUpgrade triggers an upgrade on an environment
// For environment ID "0" (local), uses local upgrade service
// For remote environments, proxies the request to the remote agent
func (h *EnvironmentHandler) TriggerEnvironmentUpgrade(c *gin.Context) {
	environmentID := c.Param("id")

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	// Handle local environment (ID "0")
	if environmentID == LOCAL_DOCKER_ENVIRONMENT_ID {
		slog.Info("Local system upgrade triggered", "user", currentUser.Username, "userId", currentUser.ID)

		err := h.upgradeService.UpgradeToLatest(c.Request.Context(), *currentUser)
		if err != nil {
			slog.Error("Local system upgrade failed", "error", err, "user", currentUser.Username)

			statusCode := http.StatusInternalServerError
			if err == services.ErrUpgradeInProgress {
				statusCode = http.StatusConflict
			}

			c.JSON(statusCode, gin.H{
				"error":   err.Error(),
				"message": "Failed to initiate upgrade",
			})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"message": "Upgrade initiated successfully. Arcane will restart shortly.",
			"success": true,
		})
		return
	}

	// Handle remote environment
	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Environment not found",
		})
		return
	}

	slog.Info("Remote environment upgrade triggered",
		"user", currentUser.Username,
		"userId", currentUser.ID,
		"environmentId", environmentID,
		"environmentName", environment.Name)

	// Build URL for remote agent's upgrade endpoint
	targetURL := strings.TrimRight(environment.ApiUrl, "/") + "/api/environments/0/system/upgrade"

	// Create request to remote agent
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, targetURL, bytes.NewReader([]byte("{}")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create request: " + err.Error(),
		})
		return
	}

	req.Header.Set("Content-Type", "application/json")

	// Add agent token if available
	if environment.AccessToken != nil && *environment.AccessToken != "" {
		req.Header.Set("X-Arcane-Agent-Token", *environment.AccessToken)
	}

	// Forward request to remote agent
	resp, err := h.httpClient.Do(req)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "Failed to trigger upgrade on remote environment",
			"environmentId", environmentID,
			"error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Failed to connect to remote environment: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to read response from remote environment",
		})
		return
	}

	// Parse response
	var upgradeResponse map[string]interface{}
	if err := json.Unmarshal(body, &upgradeResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to parse response from remote environment",
		})
		return
	}

	// Log the result
	if resp.StatusCode == http.StatusAccepted {
		slog.Info("Remote environment upgrade initiated successfully",
			"environmentId", environmentID,
			"environmentName", environment.Name)
	} else {
		slog.Error("Remote environment upgrade failed",
			"environmentId", environmentID,
			"environmentName", environment.Name,
			"statusCode", resp.StatusCode,
			"response", string(body))
	}

	// Return the remote agent's response with success indicator
	upgradeResponse["success"] = resp.StatusCode == http.StatusAccepted
	c.JSON(resp.StatusCode, upgradeResponse)
}
