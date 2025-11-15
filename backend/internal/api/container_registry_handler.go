package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
	registry "github.com/ofkm/arcane-backend/internal/utils/registry"
)

type ContainerRegistryHandler struct {
	registryService *services.ContainerRegistryService
}

func NewContainerRegistryHandler(group *gin.RouterGroup, registryService *services.ContainerRegistryService, authMiddleware *middleware.AuthMiddleware, envMiddleware gin.HandlerFunc) {
	handler := &ContainerRegistryHandler{registryService: registryService}

	envApiGroup := group.Group("/environments/:id/container-registries")
	envApiGroup.Use(authMiddleware.WithAdminNotRequired().Add(), envMiddleware)
	{
		envApiGroup.GET("", handler.GetRegistries)
		envApiGroup.POST("", handler.CreateRegistry)
		envApiGroup.GET("/:registryId", handler.GetRegistry)
		envApiGroup.PUT("/:registryId", handler.UpdateRegistry)
		envApiGroup.DELETE("/:registryId", handler.DeleteRegistry)
		envApiGroup.POST("/:registryId/test", handler.TestRegistry)
	}
}

func (h *ContainerRegistryHandler) GetRegistries(c *gin.Context) {
	params := pagination.ExtractListModifiersQueryParams(c)

	registries, paginationResp, err := h.registryService.GetRegistriesPaginated(c.Request.Context(), params)
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
		"pagination": paginationResp,
	})
}

func (h *ContainerRegistryHandler) GetRegistry(c *gin.Context) {
	registryID := c.Param("registryId")

	registry, err := h.registryService.GetRegistryByID(c.Request.Context(), registryID)
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
	registryID := c.Param("registryId")

	var req models.UpdateContainerRegistryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := models.NewValidationError("Invalid request data", err)
		c.JSON(apiErr.HTTPStatus(), gin.H{
			"success": false,
			"data":    gin.H{"error": apiErr.Message},
		})
		return
	}

	registry, err := h.registryService.UpdateRegistry(c.Request.Context(), registryID, req)
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
	registryID := c.Param("registryId")

	if err := h.registryService.DeleteRegistry(c.Request.Context(), registryID); err != nil {
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
	registryID := c.Param("registryId")

	registry, err := h.registryService.GetRegistryByID(c.Request.Context(), registryID)
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
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"data":    testResult,
	})
}

func (h *ContainerRegistryHandler) performRegistryTest(ctx context.Context, registryModel *models.ContainerRegistry, decryptedToken string) (map[string]interface{}, error) {
	var creds *registry.Credentials
	if registryModel.Username != "" && decryptedToken != "" {
		creds = &registry.Credentials{
			Username: registryModel.Username,
			Token:    decryptedToken,
		}
	}

	testResult, err := registry.TestRegistryConnection(ctx, registryModel.URL, creds)
	if err != nil {
		return nil, err
	}

	if !testResult.AuthSuccess {
		if len(testResult.Errors) > 0 {
			return nil, fmt.Errorf("%s", testResult.Errors[0])
		}
		return nil, fmt.Errorf("invalid credentials")
	}

	return map[string]interface{}{
		"message": "Authentication succeeded",
	}, nil
}
