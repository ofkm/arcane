package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type GlobalVariablesHandler struct {
	globalVariablesService *services.GlobalVariablesService
	cfg                    *config.Config
}

func NewGlobalVariablesHandler(
	group *gin.RouterGroup,
	globalVariablesService *services.GlobalVariablesService,
	authMiddleware *middleware.AuthMiddleware,
	cfg *config.Config,
) {
	h := &GlobalVariablesHandler{
		globalVariablesService: globalVariablesService,
		cfg:                    cfg,
	}

	apiGroup := group.Group("/global-variables")
	apiGroup.Use(authMiddleware.WithAdminRequired().Add())
	{
		apiGroup.GET("", h.GetGlobalVariables)
		apiGroup.PUT("", h.UpdateGlobalVariables)
	}
}

// GetGlobalVariables retrieves all global environment variables
func (h *GlobalVariablesHandler) GetGlobalVariables(c *gin.Context) {
	vars, err := h.globalVariablesService.GetGlobalVariables(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to retrieve global variables: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": dto.GetGlobalVariablesResponse{
			Variables: vars,
		},
	})
}

// UpdateGlobalVariables updates the global environment variables
func (h *GlobalVariablesHandler) UpdateGlobalVariables(c *gin.Context) {
	var req dto.UpdateGlobalVariablesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	if err := h.globalVariablesService.UpdateGlobalVariables(c.Request.Context(), req.Variables); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to update global variables: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"message": "Global variables updated successfully",
		},
	})
}
