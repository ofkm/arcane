package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type ContainerRegistryHandler struct {
	registryService *services.ContainerRegistryService
}

func NewContainerRegistryHandler(registryService *services.ContainerRegistryService) *ContainerRegistryHandler {
	return &ContainerRegistryHandler{
		registryService: registryService,
	}
}

func (h *ContainerRegistryHandler) GetRegistries(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid pagination or sort parameters: " + err.Error()},
		})
		return
	}

	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	registries, pagination, err := h.registryService.GetRegistriesPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to list registries: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       registries,
		"pagination": pagination,
	})
}

func (h *ContainerRegistryHandler) GetRegistry(c *gin.Context) {
	id := c.Param("id")

	registry, err := h.registryService.GetRegistryByID(c.Request.Context(), id)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	out, mapErr := dto.MapOne[*models.ContainerRegistry, dto.ContainerRegistryDto](registry)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map registry"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *ContainerRegistryHandler) CreateRegistry(c *gin.Context) {
	var req models.CreateContainerRegistryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := models.NewValidationError("Invalid request data", err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	registry, err := h.registryService.CreateRegistry(c.Request.Context(), req)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	out, mapErr := dto.MapOne[*models.ContainerRegistry, dto.ContainerRegistryDto](registry)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map registry"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *ContainerRegistryHandler) UpdateRegistry(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateContainerRegistryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := models.NewValidationError("Invalid request data", err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	registry, err := h.registryService.UpdateRegistry(c.Request.Context(), id, req)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	out, mapErr := dto.MapOne[*models.ContainerRegistry, dto.ContainerRegistryDto](registry)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to map registry"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *ContainerRegistryHandler) DeleteRegistry(c *gin.Context) {
	id := c.Param("id")

	if err := h.registryService.DeleteRegistry(c.Request.Context(), id); err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Container registry deleted successfully"},
	})
}

func (h *ContainerRegistryHandler) TestRegistry(c *gin.Context) {
	id := c.Param("id")

	registry, err := h.registryService.GetRegistryByID(c.Request.Context(), id)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	decryptedToken, err := utils.Decrypt(registry.Token)
	if err != nil {
		apiErr := models.NewInternalServerError("Failed to decrypt token")
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	testResult, err := h.performRegistryTest(c.Request.Context(), registry, decryptedToken)
	if err != nil {
		apiErr := models.NewInternalServerError(fmt.Sprintf("Registry test failed: %s", err.Error()))
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    testResult,
	})
}

func (h *ContainerRegistryHandler) performRegistryTest(ctx context.Context, registry *models.ContainerRegistry, decryptedToken string) (map[string]interface{}, error) {
	var creds *utils.RegistryCredentials
	if registry.Username != "" && decryptedToken != "" {
		creds = &utils.RegistryCredentials{
			Username: registry.Username,
			Token:    decryptedToken,
		}
	}

	testResult, err := utils.TestRegistryConnection(ctx, registry.URL, creds)
	if err != nil {
		return nil, fmt.Errorf("registry test failed: %w", err)
	}

	result := map[string]interface{}{
		"status":          getStatusString(testResult.OverallSuccess),
		"url":             registry.URL,
		"username":        registry.Username,
		"timestamp":       testResult.Timestamp.Format(time.RFC3339),
		"overall_success": testResult.OverallSuccess,
		"ping_success":    testResult.PingSuccess,
		"auth_success":    testResult.AuthSuccess,
		"catalog_success": testResult.CatalogSuccess,
		"registry_url":    testResult.URL,
		"domain":          testResult.Domain,
	}

	if len(testResult.Errors) > 0 {
		result["errors"] = testResult.Errors
		result["message"] = fmt.Sprintf("Registry test completed with %d error(s)", len(testResult.Errors))
	} else {
		result["message"] = "All registry tests passed successfully"
	}

	result["tests"] = map[string]interface{}{
		"connectivity": map[string]interface{}{
			"success":     testResult.PingSuccess,
			"description": "Tests if the registry endpoint is reachable",
		},
		"authentication": map[string]interface{}{
			"success":     testResult.AuthSuccess,
			"description": "Tests if the provided credentials are valid",
			"skipped":     creds == nil,
		},
		"catalog_access": map[string]interface{}{
			"success":     testResult.CatalogSuccess,
			"description": "Tests if the registry catalog is accessible",
		},
	}

	return result, nil
}

func getStatusString(success bool) string {
	if success {
		return "success"
	}
	return "failed"
}
