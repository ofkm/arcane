package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

const LOCAL_DOCKER_ENVIRONMENT_ID = "0"

type EnvironmentHandler struct {
	environmentService *services.EnvironmentService
	settingsService    *services.SettingsService
	cfg                *config.Config
}

func NewEnvironmentHandler(
	group *gin.RouterGroup,
	environmentService *services.EnvironmentService,
	settingsService *services.SettingsService,
	authMiddleware *middleware.AuthMiddleware,
	cfg *config.Config,
) {
	h := &EnvironmentHandler{
		environmentService: environmentService,
		settingsService:    settingsService,
		cfg:                cfg,
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

	// Auto-pair with agent if bootstrap token is provided
	if (req.AccessToken == nil || *req.AccessToken == "") && req.BootstrapToken != nil && *req.BootstrapToken != "" {
		if token, err := h.environmentService.PairAgentWithBootstrap(c.Request.Context(), req.ApiUrl, *req.BootstrapToken); err == nil && token != "" {
			env.AccessToken = &token
		} else if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Agent pairing failed: " + err.Error()}})
			return
		}
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
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid pagination or sort parameters: " + err.Error()}})
		return
	}
	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	envs, pagination, err := h.environmentService.ListEnvironmentsPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to fetch environments"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       envs,
		"pagination": pagination,
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
