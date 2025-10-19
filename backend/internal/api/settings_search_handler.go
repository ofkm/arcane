package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type SettingsSearchHandler struct {
	searchService *services.SettingsSearchService
}

func NewSettingsSearchHandler(group *gin.RouterGroup, authMiddleware *middleware.AuthMiddleware) {
	handler := &SettingsSearchHandler{
		searchService: services.NewSettingsSearchService(),
	}

	apiGroup := group.Group("/settings")
	apiGroup.POST("/search", authMiddleware.WithAdminNotRequired().Add(), handler.Search)
	apiGroup.GET("/categories", authMiddleware.WithAdminNotRequired().Add(), handler.GetCategories)
}

// Search performs a search across settings categories and returns relevance-scored results
// @Summary Search settings
// @Description Search across all settings categories and individual settings with relevance scoring
// @Tags settings
// @Accept json
// @Produce json
// @Param request body dto.SettingsSearchRequest true "Search query"
// @Success 200 {object} dto.SettingsSearchResponse
// @Failure 400 {object} dto.MessageDto
// @Router /api/settings/search [post]
func (h *SettingsSearchHandler) Search(c *gin.Context) {
	var req dto.SettingsSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request: " + err.Error()},
		})
		return
	}

	results := h.searchService.Search(req.Query)
	c.JSON(http.StatusOK, results)
}

// GetCategories returns all available settings categories
// @Summary Get all settings categories
// @Description Get a list of all available settings categories with their metadata
// @Tags settings
// @Produce json
// @Success 200 {array} dto.SettingsCategory
// @Router /api/settings/categories [get]
func (h *SettingsSearchHandler) GetCategories(c *gin.Context) {
	categories := h.searchService.GetSettingsCategories()
	c.JSON(http.StatusOK, categories)
}
