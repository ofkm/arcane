package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils/registry"
)

type ImageUpdateHandler struct {
	imageUpdateService *services.ImageUpdateService
}

const (
	maxVersionLimit = 100
)

func NewImageUpdateHandler(group *gin.RouterGroup, imageUpdateService *services.ImageUpdateService, authMiddleware *middleware.AuthMiddleware) {
	handler := &ImageUpdateHandler{imageUpdateService: imageUpdateService}

	apiGroup := group.Group("/environments/:id/image-updates")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/check", handler.CheckImageUpdate)
		apiGroup.GET("/check/:imageId", handler.CheckImageUpdateByID)
		apiGroup.POST("/check-batch", handler.CheckMultipleImages)
		apiGroup.GET("/check-all", handler.CheckAllImages)
		apiGroup.GET("/summary", handler.GetUpdateSummary)
		apiGroup.GET("/versions", handler.GetImageVersions)
		apiGroup.POST("/compare", handler.CompareVersions)
	}
}

func (h *ImageUpdateHandler) CheckImageUpdate(c *gin.Context) {
	imageRef := c.Query("imageRef")
	if imageRef == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "imageRef query parameter is required",
		})
		return
	}

	result, err := h.imageUpdateService.CheckImageUpdate(c.Request.Context(), imageRef)
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    result,
	})
}

func (h *ImageUpdateHandler) CheckImageUpdateByID(c *gin.Context) {
	imageID := c.Param("imageId")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "imageId parameter is required",
		})
		return
	}

	result, err := h.imageUpdateService.CheckImageUpdateByID(c.Request.Context(), imageID)
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    result,
	})
}

func (h *ImageUpdateHandler) CheckMultipleImages(c *gin.Context) {
	var req dto.BatchImageUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid request format: " + err.Error(),
		})
		return
	}

	if len(req.ImageRefs) == 0 {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "At least one imageRef is required",
		})
		return
	}

	results, err := h.imageUpdateService.CheckMultipleImages(c.Request.Context(), req.ImageRefs, req.Credentials)
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	response := dto.BatchImageUpdateResponse(results)

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    response,
	})
}

func (h *ImageUpdateHandler) CheckAllImages(c *gin.Context) {
	var req dto.BatchImageUpdateRequest
	_ = c.ShouldBindJSON(&req)

	results, err := h.imageUpdateService.CheckAllImages(c.Request.Context(), 0, req.Credentials)
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	response := dto.BatchImageUpdateResponse(results)

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    response,
	})
}

func (h *ImageUpdateHandler) GetUpdateSummary(c *gin.Context) {
	summary, err := h.imageUpdateService.GetUpdateSummary(c.Request.Context())
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    summary,
	})
}

func (h *ImageUpdateHandler) GetImageVersions(c *gin.Context) {
	imageRef := c.Query("imageRef")
	if imageRef == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "imageRef query parameter is required",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid limit parameter: must be a positive integer",
		})
		return
	}

	if limit > maxVersionLimit {
		limit = maxVersionLimit
	}

	versions, err := h.imageUpdateService.GetAvailableVersions(c.Request.Context(), imageRef, limit)
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    versions,
	})
}

func (h *ImageUpdateHandler) CompareVersions(c *gin.Context) {
	var req dto.CompareVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid request format: " + err.Error(),
		})
		return
	}

	comparison, err := h.imageUpdateService.CompareVersions(c.Request.Context(), req.ImageRef, req.CurrentVersion, req.TargetVersion)
	if err != nil {
		status := registry.DetermineHTTPStatusFromError(err)
		c.JSON(status, dto.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    comparison,
	})
}
