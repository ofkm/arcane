package api

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type TemplateHandler struct {
	templateService *services.TemplateService
}

func NewTemplateHandler(group *gin.RouterGroup, templateService *services.TemplateService, authMiddleware *middleware.AuthMiddleware) {
	handler := &TemplateHandler{templateService: templateService}

	apiGroup := group.Group("/templates")

	apiGroup.GET("/fetch", handler.FetchRegistry)

	apiGroup.GET("", authMiddleware.WithAdminNotRequired().WithSuccessOptional().Add(), handler.GetAllTemplatesPaginated)
	apiGroup.GET("/all", authMiddleware.WithAdminNotRequired().WithSuccessOptional().Add(), handler.GetAllTemplates)
	apiGroup.GET("/:id", authMiddleware.WithAdminNotRequired().WithSuccessOptional().Add(), handler.GetTemplate)
	apiGroup.GET("/:id/content", authMiddleware.WithAdminNotRequired().WithSuccessOptional().Add(), handler.GetTemplateContent)

	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.POST("", handler.CreateTemplate)
		apiGroup.PUT("/:id", handler.UpdateTemplate)
		apiGroup.DELETE("/:id", handler.DeleteTemplate)
		apiGroup.POST("/:id/download", handler.DownloadTemplate)
		apiGroup.GET("/default", handler.GetDefaultTemplates)
		apiGroup.POST("/default", handler.SaveDefaultTemplates)
		apiGroup.GET("/registries", handler.GetRegistries)
		apiGroup.POST("/registries", handler.CreateRegistry)
		apiGroup.PUT("/registries/:id", handler.UpdateRegistry)
		apiGroup.DELETE("/registries/:id", handler.DeleteRegistry)
		apiGroup.GET("/variables", handler.GetGlobalVariables)
		apiGroup.PUT("/variables", handler.UpdateGlobalVariables)
	}
}

func (h *TemplateHandler) GetAllTemplatesPaginated(c *gin.Context) {
	params := pagination.ExtractListModifiersQueryParams(c)

	if params.Limit == 0 {
		params.Limit = 20
	}

	templates, paginationResp, err := h.templateService.GetAllTemplatesPaginated(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get templates: " + err.Error()},
		})
		return
	}

	pagination.ApplyFilterResultsHeaders(&c.Writer, pagination.FilterResult[dto.ComposeTemplateDto]{
		Items:          templates,
		TotalCount:     paginationResp.TotalItems,
		TotalAvailable: paginationResp.GrandTotalItems,
	})

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       templates,
		"pagination": paginationResp,
	})
}

func (h *TemplateHandler) GetAllTemplates(c *gin.Context) {
	templates, err := h.templateService.GetAllTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get templates: " + err.Error()},
		})
		return
	}

	var out []dto.ComposeTemplateDto
	if mapped, mapErr := dto.MapSlice[models.ComposeTemplate, dto.ComposeTemplateDto](templates); mapErr == nil {
		out = mapped
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map templates: " + mapErr.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) GetTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Template ID is required"},
		})
		return
	}

	template, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		status := http.StatusInternalServerError
		msg := "Failed to get template: " + err.Error()
		if err.Error() == "template not found" {
			status = http.StatusNotFound
			msg = "Template not found"
		}
		c.JSON(status, gin.H{
			"success": false,
			"data":    gin.H{"error": msg},
		})
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(template, &out); mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map template: " + mapErr.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) GetTemplateContent(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Template ID is required"},
		})
		return
	}

	contentData, err := h.templateService.GetTemplateContentWithParsedData(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get template content: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contentData,
	})
}

func (h *TemplateHandler) CreateTemplate(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Content     string `json:"content" binding:"required"`
		EnvContent  string `json:"envContent"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	template := &models.ComposeTemplate{
		Name:        req.Name,
		Description: req.Description,
		Content:     req.Content,
		IsCustom:    true,
		IsRemote:    false,
	}
	if req.EnvContent != "" {
		template.EnvContent = &req.EnvContent
	}

	if err := h.templateService.CreateTemplate(c.Request.Context(), template); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to create template: " + err.Error()},
		})
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(template, &out); mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map template: " + mapErr.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) UpdateTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Template ID is required"},
		})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Content     string `json:"content" binding:"required"`
		EnvContent  string `json:"envContent"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	updates := &models.ComposeTemplate{
		Name:        req.Name,
		Description: req.Description,
		Content:     req.Content,
	}
	if req.EnvContent != "" {
		updates.EnvContent = &req.EnvContent
	} else {
		updates.EnvContent = nil
	}

	if err := h.templateService.UpdateTemplate(c.Request.Context(), id, updates); err != nil {
		status := http.StatusInternalServerError
		msg := "Failed to update template: " + err.Error()
		if err.Error() == "template not found" {
			status = http.StatusNotFound
			msg = "Template not found"
		}
		c.JSON(status, gin.H{
			"success": false,
			"data":    gin.H{"error": msg},
		})
		return
	}

	updated, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"message": "Template updated successfully"},
		})
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(updated, &out); mapErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"message": "Template updated successfully"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) DeleteTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Template ID is required"},
		})
		return
	}

	if err := h.templateService.DeleteTemplate(c.Request.Context(), id); err != nil {
		status := http.StatusInternalServerError
		msg := "Failed to delete template: " + err.Error()
		if err.Error() == "template not found" {
			status = http.StatusNotFound
			msg = "Template not found"
		}
		c.JSON(status, gin.H{
			"success": false,
			"data":    gin.H{"error": msg},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Template deleted successfully"},
	})
}

func (h *TemplateHandler) GetDefaultTemplates(c *gin.Context) {
	composeTemplate := h.templateService.GetComposeTemplate()
	envTemplate := h.templateService.GetEnvTemplate()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"composeTemplate": composeTemplate,
			"envTemplate":     envTemplate,
		},
	})
}

func (h *TemplateHandler) SaveDefaultTemplates(c *gin.Context) {
	var req struct {
		ComposeContent string `json:"composeContent" binding:"required"`
		EnvContent     string `json:"envContent"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	if err := h.templateService.SaveComposeTemplate(req.ComposeContent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to save compose template: " + err.Error()},
		})
		return
	}

	if err := h.templateService.SaveEnvTemplate(req.EnvContent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to save env template: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Default templates saved successfully"},
	})
}

func (h *TemplateHandler) GetRegistries(c *gin.Context) {
	registries, err := h.templateService.GetRegistries(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get registries: " + err.Error()},
		})
		return
	}

	out, mapErr := dto.MapSlice[models.TemplateRegistry, dto.TemplateRegistryDto](registries)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map registries: " + mapErr.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) CreateRegistry(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		URL         string `json:"url" binding:"required"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	registry := &models.TemplateRegistry{
		Name:        req.Name,
		URL:         req.URL,
		Description: req.Description,
		Enabled:     req.Enabled,
	}
	if err := h.templateService.CreateRegistry(c.Request.Context(), registry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to create registry: " + err.Error()},
		})
		return
	}

	var out dto.TemplateRegistryDto
	if mapErr := dto.MapStruct(registry, &out); mapErr != nil {
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data":    gin.H{"message": "Registry created"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) UpdateRegistry(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Registry ID is required"},
		})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		URL         string `json:"url" binding:"required"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	updates := &models.TemplateRegistry{
		Name:        req.Name,
		URL:         req.URL,
		Description: req.Description,
		Enabled:     req.Enabled,
	}
	if err := h.templateService.UpdateRegistry(c.Request.Context(), id, updates); err != nil {
		status := http.StatusInternalServerError
		msg := "Failed to update registry: " + err.Error()
		if err.Error() == "registry not found" {
			status = http.StatusNotFound
			msg = "Registry not found"
		}
		c.JSON(status, gin.H{
			"success": false,
			"data":    gin.H{"error": msg},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Registry updated successfully"},
	})
}

func (h *TemplateHandler) DeleteRegistry(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Registry ID is required"},
		})
		return
	}

	if err := h.templateService.DeleteRegistry(c.Request.Context(), id); err != nil {
		status := http.StatusInternalServerError
		msg := "Failed to delete registry: " + err.Error()
		if err.Error() == "registry not found" {
			status = http.StatusNotFound
			msg = "Registry not found"
		}
		c.JSON(status, gin.H{
			"success": false,
			"data":    gin.H{"error": msg},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Registry deleted successfully"},
	})
}

func (h *TemplateHandler) FetchRegistry(c *gin.Context) {
	url := c.Query("url")
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "URL parameter is required"},
		})
		return
	}

	body, err := h.templateService.FetchRaw(c.Request.Context(), url)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Failed to fetch registry: " + err.Error()}})
		return
	}

	var registry interface{}
	if err := json.Unmarshal(body, &registry); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Invalid JSON response: " + err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    registry,
	})
}

func (h *TemplateHandler) DownloadTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Template ID is required"}})
		return
	}

	template, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Template not found"}})
		return
	}
	if !template.IsRemote {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Template is already local"}})
		return
	}

	localTemplate, err := h.templateService.DownloadTemplate(c.Request.Context(), template)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to download template: " + err.Error()}})
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(localTemplate, &out); mapErr != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"message": "Template downloaded successfully"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *TemplateHandler) GetGlobalVariables(c *gin.Context) {
	vars, err := h.templateService.GetGlobalVariables(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to retrieve global variables: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    vars,
	})
}

func (h *TemplateHandler) UpdateGlobalVariables(c *gin.Context) {
	var req dto.UpdateVariablesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	if err := h.templateService.UpdateGlobalVariables(c.Request.Context(), req.Variables); err != nil {
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
