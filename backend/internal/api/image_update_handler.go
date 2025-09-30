package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ImageUpdateHandler struct {
	imageUpdateService *services.ImageUpdateService
}

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
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "imageRef query parameter is required",
		})
		return
	}

	result, err := h.imageUpdateService.CheckImageUpdate(c.Request.Context(), imageRef)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check image update: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *ImageUpdateHandler) CheckImageUpdateByID(c *gin.Context) {
	imageID := c.Param("imageId")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "imageId parameter is required",
		})
		return
	}

	result, err := h.imageUpdateService.CheckImageUpdateByID(c.Request.Context(), imageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check image update: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *ImageUpdateHandler) CheckMultipleImages(c *gin.Context) {
	var req dto.BatchImageUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	if len(req.ImageRefs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "At least one imageRef is required",
		})
		return
	}

	results, err := h.imageUpdateService.CheckMultipleImages(c.Request.Context(), req.ImageRefs, req.Credentials)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check image updates: " + err.Error(),
		})
		return
	}

	response := dto.BatchImageUpdateResponse(results)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *ImageUpdateHandler) CheckAllImages(c *gin.Context) {
	var req dto.BatchImageUpdateRequest
	_ = c.ShouldBindJSON(&req)

	results, err := h.imageUpdateService.CheckAllImages(c.Request.Context(), 0, req.Credentials)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check all images: " + err.Error(),
		})
		return
	}

	response := dto.BatchImageUpdateResponse(results)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *ImageUpdateHandler) GetUpdateSummary(c *gin.Context) {
	summary, err := h.imageUpdateService.GetUpdateSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get update summary: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

func (h *ImageUpdateHandler) GetImageVersions(c *gin.Context) {
	imageRef := c.Query("imageRef")
	if imageRef == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "imageRef query parameter is required",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid limit parameter",
		})
		return
	}

	versions, err := h.imageUpdateService.GetAvailableVersions(c.Request.Context(), imageRef, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get image versions: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    versions,
	})
}

func (h *ImageUpdateHandler) CompareVersions(c *gin.Context) {
	var req dto.CompareVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	comparison, err := h.imageUpdateService.CompareVersions(c.Request.Context(), req.ImageRef, req.CurrentVersion, req.TargetVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to compare versions: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    comparison,
	})
}
