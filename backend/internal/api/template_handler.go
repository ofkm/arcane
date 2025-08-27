package api

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type TemplateHandler struct {
	templateService *services.TemplateService
}

func NewTemplateHandler(templateService *services.TemplateService) *TemplateHandler {
	return &TemplateHandler{
		templateService: templateService,
	}
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

	template, err := h.templateService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"data":    gin.H{"error": "Template not found"},
		})
		return
	}

	var outTemplate dto.ComposeTemplateDto
	if mapErr := dto.MapStruct(template, &outTemplate); mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map template: " + mapErr.Error()},
		})
		return
	}

	var composeContent, envContent string
	if template.IsRemote {
		composeContent, envContent, err = h.templateService.FetchTemplateContent(c.Request.Context(), template)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"data":    gin.H{"error": "Failed to fetch template content: " + err.Error()},
			})
			return
		}
	} else {
		composeContent = template.Content
		if template.EnvContent != nil {
			envContent = *template.EnvContent
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"content":    composeContent,
			"envContent": envContent,
			"template":   outTemplate,
		},
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

func (h *TemplateHandler) GetEnvTemplate(c *gin.Context) {
	content := h.templateService.GetEnvTemplate()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"content": content},
	})
}

func (h *TemplateHandler) SaveEnvTemplate(c *gin.Context) {
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
		})
		return
	}

	if err := h.templateService.SaveEnvTemplate(req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to save env template: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Environment template saved successfully"},
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

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, url, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid URL: " + err.Error()}})
		return
	}

	req.Header.Set("User-Agent", "Arcane-Backend/1.0")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Failed to fetch registry: " + err.Error()}})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": fmt.Sprintf("Registry returned status %d", resp.StatusCode)}})
		return
	}

	var reader io.Reader = resp.Body
	if strings.Contains(resp.Header.Get("Content-Encoding"), "gzip") {
		gzipReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to create gzip reader: " + err.Error()}})
			return
		}
		defer gzipReader.Close()
		reader = gzipReader
	}

	body, err := io.ReadAll(reader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to read response: " + err.Error()}})
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
