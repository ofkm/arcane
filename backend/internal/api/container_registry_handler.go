package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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

// GetRegistries godoc
// @Summary Get all container registries
// @Description Get all container registries
// @Tags container-registries
// @Accept json
// @Produce json
// @Success 200 {object} models.APISuccessResponse
// @Failure 500 {object} models.APIErrorResponse
// @Router /container-registries [get]
func (h *ContainerRegistryHandler) GetRegistries(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pagination or sort parameters: " + err.Error(),
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
			"error":   "Failed to list registries: " + err.Error(),
		})
		return
	}

	for i := range registries {
		registries[i].Token = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       registries,
		"pagination": pagination,
	})
}

// GetRegistry godoc
// @Summary Get a container registry by ID
// @Description Get a container registry by ID
// @Tags container-registries
// @Accept json
// @Produce json
// @Param id path string true "Registry ID"
// @Success 200 {object} models.APISuccessResponse
// @Failure 404 {object} models.APIErrorResponse
// @Failure 500 {object} models.APIErrorResponse
// @Router /container-registries/{id} [get]
func (h *ContainerRegistryHandler) GetRegistry(c *gin.Context) {
	id := c.Param("id")

	registry, err := h.registryService.GetRegistryByID(c.Request.Context(), id)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	registry.Token = ""

	c.JSON(http.StatusOK, models.APISuccessResponse{
		Success: true,
		Data:    registry,
	})
}

// CreateRegistry godoc
// @Summary Create a new container registry
// @Description Create a new container registry
// @Tags container-registries
// @Accept json
// @Produce json
// @Param registry body models.CreateContainerRegistryRequest true "Registry data"
// @Success 201 {object} models.APISuccessResponse
// @Failure 400 {object} models.APIErrorResponse
// @Failure 500 {object} models.APIErrorResponse
// @Router /container-registries [post]
func (h *ContainerRegistryHandler) CreateRegistry(c *gin.Context) {
	var req models.CreateContainerRegistryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := models.NewValidationError("Invalid request data", err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	registry, err := h.registryService.CreateRegistry(c.Request.Context(), req)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	registry.Token = ""

	c.JSON(http.StatusCreated, models.APISuccessResponse{
		Success: true,
		Data:    registry,
		Message: "Container registry created successfully",
	})
}

// UpdateRegistry godoc
// @Summary Update a container registry
// @Description Update a container registry
// @Tags container-registries
// @Accept json
// @Produce json
// @Param id path string true "Registry ID"
// @Param registry body models.UpdateContainerRegistryRequest true "Registry data"
// @Success 200 {object} models.APISuccessResponse
// @Failure 400 {object} models.APIErrorResponse
// @Failure 404 {object} models.APIErrorResponse
// @Failure 500 {object} models.APIErrorResponse
// @Router /container-registries/{id} [put]
func (h *ContainerRegistryHandler) UpdateRegistry(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateContainerRegistryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := models.NewValidationError("Invalid request data", err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	registry, err := h.registryService.UpdateRegistry(c.Request.Context(), id, req)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	registry.Token = ""

	c.JSON(http.StatusOK, models.APISuccessResponse{
		Success: true,
		Data:    registry,
		Message: "Container registry updated successfully",
	})
}

// DeleteRegistry godoc
// @Summary Delete a container registry
// @Description Delete a container registry
// @Tags container-registries
// @Accept json
// @Produce json
// @Param id path string true "Registry ID"
// @Success 200 {object} models.APISuccessResponse
// @Failure 404 {object} models.APIErrorResponse
// @Failure 500 {object} models.APIErrorResponse
// @Router /container-registries/{id} [delete]
func (h *ContainerRegistryHandler) DeleteRegistry(c *gin.Context) {
	id := c.Param("id")

	err := h.registryService.DeleteRegistry(c.Request.Context(), id)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	c.JSON(http.StatusOK, models.APISuccessResponse{
		Success: true,
		Message: "Container registry deleted successfully",
	})
}

// TestRegistry godoc
// @Summary Test connection to a container registry
// @Description Test connection to a container registry
// @Tags container-registries
// @Accept json
// @Produce json
// @Param id path string true "Registry ID"
// @Success 200 {object} models.APISuccessResponse
// @Failure 404 {object} models.APIErrorResponse
// @Failure 500 {object} models.APIErrorResponse
// @Router /container-registries/{id}/test [post]
func (h *ContainerRegistryHandler) TestRegistry(c *gin.Context) {
	id := c.Param("id")

	registry, err := h.registryService.GetRegistryByID(c.Request.Context(), id)
	if err != nil {
		apiErr := models.ToAPIError(err)
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
			Details: apiErr.Details,
		})
		return
	}

	decryptedToken, err := utils.Decrypt(registry.Token)
	if err != nil {
		apiErr := models.NewInternalServerError("Failed to decrypt token")
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
		})
		return
	}

	testResult, err := h.performRegistryTest(c.Request.Context(), registry, decryptedToken)
	if err != nil {
		apiErr := models.NewInternalServerError(fmt.Sprintf("Registry test failed: %s", err.Error()))
		c.JSON(apiErr.HTTPStatus(), models.APIErrorResponse{
			Success: false,
			Error:   apiErr.Message,
			Code:    apiErr.Code,
		})
		return
	}

	c.JSON(http.StatusOK, models.APISuccessResponse{
		Success: true,
		Data:    testResult,
		Message: "Registry test completed successfully",
	})
}

// performRegistryTest performs the actual registry connection test using registry utils
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
