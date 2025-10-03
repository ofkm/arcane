package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type VariablesHandler struct {
	variablesService *services.VariablesService
	cfg              *config.Config
}

func NewVariablesHandler(
	group *gin.RouterGroup,
	variablesService *services.VariablesService,
	authMiddleware *middleware.AuthMiddleware,
	cfg *config.Config,
) {
	h := &VariablesHandler{
		variablesService: variablesService,
		cfg:              cfg,
	}

	apiGroup := group.Group("/global-variables")
	apiGroup.Use(authMiddleware.WithAdminRequired().Add())
	{
		apiGroup.GET("", h.GetVariables)
		apiGroup.PUT("", h.UpdateVariables)
	}
}

func (h *VariablesHandler) GetVariables(c *gin.Context) {
	vars, err := h.variablesService.GetGlobalVariables(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to retrieve global variables: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": dto.GetVariablesResponse{
			Variables: vars,
		},
	})
}

func (h *VariablesHandler) UpdateVariables(c *gin.Context) {
	var req dto.UpdateVariablesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	if err := h.variablesService.UpdateGlobalVariables(c.Request.Context(), req.Variables); err != nil {
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
