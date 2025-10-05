package api

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
)

type TemplateHandler struct {
	templateService *services.TemplateService
}

func NewTemplateHandler(group *gin.RouterGroup, templateService *services.TemplateService, authMiddleware *middleware.AuthMiddleware) {
	handler := &TemplateHandler{templateService: templateService}

	apiGroup := group.Group("/templates")

	apiGroup.GET("/fetch", handler.FetchRegistry)

	apiGroup.GET("", authMiddleware.WithAdminNotRequired().WithSuccessOptional().Add(), handler.GetAllTemplates)
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

func (h *TemplateHandler) GetAllTemplates(c *gin.Context) {
	templates, err := h.templateService.GetAllTemplates(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	var out []dto.ComposeTemplateDto
	if mapped, mapErr := dto.MapSlice[models.ComposeTemplate, dto.ComposeTemplateDto](templates); mapErr == nil {
		out = mapped
	} else {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *TemplateHandler) GetTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Template ID is required")
		return
	}

	template, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "template not found" {
			httputil.RespondNotFound(c, "Template not found")
		} else {
			httputil.RespondWithError(c, err)
		}
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(template, &out); mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *TemplateHandler) GetTemplateContent(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Template ID is required")
		return
	}

	template, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		httputil.RespondNotFound(c, "Template not found")
		return
	}

	var outTemplate dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(template, &outTemplate); mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	var composeContent, envContent string
	if template.IsRemote {
		composeContent, envContent, err = h.templateService.FetchTemplateContent(c.Request.Context(), template)
		if err != nil {
			httputil.RespondWithError(c, err)
			return
		}
	} else {
		composeContent = template.Content
		if template.EnvContent != nil {
			envContent = *template.EnvContent
		}
	}

	response := gin.H{
		"content":    composeContent,
		"envContent": envContent,
		"template":   outTemplate,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *TemplateHandler) CreateTemplate(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Content     string `json:"content" binding:"required"`
		EnvContent  string `json:"envContent"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
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
		httputil.RespondWithError(c, err)
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(template, &out); mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusCreated, out)
}

func (h *TemplateHandler) UpdateTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Template ID is required")
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Content     string `json:"content" binding:"required"`
		EnvContent  string `json:"envContent"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
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
		if err.Error() == "template not found" {
			httputil.RespondNotFound(c, "Template not found")
		} else {
			httputil.RespondWithError(c, err)
		}
		return
	}

	updated, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		httputil.RespondWithMessage(c, http.StatusOK, "Template updated successfully")
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(updated, &out); mapErr != nil {
		httputil.RespondWithMessage(c, http.StatusOK, "Template updated successfully")
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *TemplateHandler) DeleteTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Template ID is required")
		return
	}

	if err := h.templateService.DeleteTemplate(c.Request.Context(), id); err != nil {
		if err.Error() == "template not found" {
			httputil.RespondNotFound(c, "Template not found")
		} else {
			httputil.RespondWithError(c, err)
		}
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Template deleted successfully")
}

func (h *TemplateHandler) GetDefaultTemplates(c *gin.Context) {
	composeTemplate := h.templateService.GetComposeTemplate()
	envTemplate := h.templateService.GetEnvTemplate()

	response := gin.H{
		"composeTemplate": composeTemplate,
		"envTemplate":     envTemplate,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *TemplateHandler) SaveDefaultTemplates(c *gin.Context) {
	var req struct {
		ComposeContent string `json:"composeContent" binding:"required"`
		EnvContent     string `json:"envContent"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
		return
	}

	if err := h.templateService.SaveComposeTemplate(req.ComposeContent); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	if err := h.templateService.SaveEnvTemplate(req.EnvContent); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Default templates saved successfully")
}

func (h *TemplateHandler) GetRegistries(c *gin.Context) {
	registries, err := h.templateService.GetRegistries(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	out, mapErr := dto.MapSlice[models.TemplateRegistry, dto.TemplateRegistryDto](registries)
	if mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *TemplateHandler) CreateRegistry(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		URL         string `json:"url" binding:"required"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
		return
	}

	registry := &models.TemplateRegistry{
		Name:        req.Name,
		URL:         req.URL,
		Description: req.Description,
		Enabled:     req.Enabled,
	}
	if err := h.templateService.CreateRegistry(c.Request.Context(), registry); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	var out dto.TemplateRegistryDto
	if mapErr := dto.MapStruct(registry, &out); mapErr != nil {
		httputil.RespondWithMessage(c, http.StatusCreated, "Registry created")
		return
	}

	httputil.RespondWithSuccess(c, http.StatusCreated, out)
}

func (h *TemplateHandler) UpdateRegistry(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Registry ID is required")
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		URL         string `json:"url" binding:"required"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
		return
	}

	updates := &models.TemplateRegistry{
		Name:        req.Name,
		URL:         req.URL,
		Description: req.Description,
		Enabled:     req.Enabled,
	}
	if err := h.templateService.UpdateRegistry(c.Request.Context(), id, updates); err != nil {
		if err.Error() == "registry not found" {
			httputil.RespondNotFound(c, "Registry not found")
		} else {
			httputil.RespondWithError(c, err)
		}
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Registry updated successfully")
}

func (h *TemplateHandler) DeleteRegistry(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Registry ID is required")
		return
	}

	if err := h.templateService.DeleteRegistry(c.Request.Context(), id); err != nil {
		if err.Error() == "registry not found" {
			httputil.RespondNotFound(c, "Registry not found")
		} else {
			httputil.RespondWithError(c, err)
		}
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Registry deleted successfully")
}

func (h *TemplateHandler) FetchRegistry(c *gin.Context) {
	url := c.Query("url")
	if url == "" {
		httputil.RespondBadRequest(c, "URL parameter is required")
		return
	}

	body, err := h.templateService.FetchRaw(c.Request.Context(), url)
	if err != nil {
		httputil.RespondWithCustomError(c, http.StatusBadGateway, "Failed to fetch registry: "+err.Error(), "FETCH_ERROR")
		return
	}

	var registry interface{}
	if err := json.Unmarshal(body, &registry); err != nil {
		httputil.RespondWithCustomError(c, http.StatusBadGateway, "Invalid JSON response: "+err.Error(), "INVALID_JSON")
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, registry)
}

func (h *TemplateHandler) DownloadTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Template ID is required")
		return
	}

	template, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		httputil.RespondNotFound(c, "Template not found")
		return
	}
	if !template.IsRemote {
		httputil.RespondBadRequest(c, "Template is already local")
		return
	}

	localTemplate, err := h.templateService.DownloadTemplate(c.Request.Context(), template)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	var out dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(localTemplate, &out); mapErr != nil {
		httputil.RespondWithMessage(c, http.StatusOK, "Template downloaded successfully")
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *TemplateHandler) GetGlobalVariables(c *gin.Context) {
	vars, err := h.templateService.GetGlobalVariables(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, vars)
}

func (h *TemplateHandler) UpdateGlobalVariables(c *gin.Context) {
	var req dto.UpdateVariablesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
		return
	}

	if err := h.templateService.UpdateGlobalVariables(c.Request.Context(), req.Variables); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Global variables updated successfully")
}
