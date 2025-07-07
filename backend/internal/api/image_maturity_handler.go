package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ImageMaturityHandler struct {
	imageMaturityService *services.ImageMaturityService
	imageService         *services.ImageService
}

func NewImageMaturityHandler(imageMaturityService *services.ImageMaturityService, imageService *services.ImageService) *ImageMaturityHandler {
	return &ImageMaturityHandler{
		imageMaturityService: imageMaturityService,
		imageService:         imageService,
	}
}

func (h *ImageMaturityHandler) MarkAsMatured(c *gin.Context) {
	imageID := c.Param("imageId")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "imageId is required",
		})
		return
	}

	type MarkMaturedRequest struct {
		DaysSinceCreation int `json:"daysSinceCreation" binding:"required"`
	}

	var req MarkMaturedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format. daysSinceCreation is required",
		})
		return
	}

	if req.DaysSinceCreation < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "daysSinceCreation must be a positive integer",
		})
		return
	}

	err := h.imageMaturityService.MarkAsMatured(c.Request.Context(), imageID, req.DaysSinceCreation)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to mark image as matured: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"message":           "Image marked as matured successfully",
		"imageId":           imageID,
		"daysSinceCreation": req.DaysSinceCreation,
	})
}

func (h *ImageMaturityHandler) GetImageMaturity(c *gin.Context) {
	imageID := c.Param("id")

	record, err := h.imageMaturityService.GetImageMaturity(c.Request.Context(), imageID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": models.ImageMaturity{
				Version:          "unknown",
				Date:             time.Now().Format(time.RFC3339),
				Status:           models.ImageStatusUnknown,
				UpdatesAvailable: false,
			},
		})
		return
	}

	maturity := models.ImageMaturity{
		Version:          record.CurrentVersion,
		Date:             record.LastChecked.Format(time.RFC3339),
		Status:           record.Status,
		UpdatesAvailable: record.UpdatesAvailable,
	}

	if record.LatestVersion != nil {
		maturity.LatestVersion = *record.LatestVersion
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    maturity,
	})
}

func (h *ImageMaturityHandler) SetImageMaturity(c *gin.Context) {
	imageID := c.Param("imageId")

	var req dto.SetMaturityDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	maturity := models.ImageMaturity{
		Version:          req.Version,
		Date:             req.Date,
		Status:           req.Status,
		UpdatesAvailable: req.UpdatesAvailable,
	}

	err := h.imageMaturityService.SetImageMaturity(
		c.Request.Context(),
		imageID,
		req.Repository,
		req.Tag,
		maturity,
		req.Metadata,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to set image maturity",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image maturity updated successfully",
	})
}

func (h *ImageMaturityHandler) ListMaturityRecords(c *gin.Context) {
	records, err := h.imageMaturityService.ListMaturityRecords(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list maturity records",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
	})
}

func (h *ImageMaturityHandler) GetImagesWithUpdates(c *gin.Context) {
	records, err := h.imageMaturityService.GetImagesWithUpdates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get images with updates",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
	})
}

func (h *ImageMaturityHandler) GetMaturityStats(c *gin.Context) {
	stats, err := h.imageMaturityService.GetMaturityStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get maturity stats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

func (h *ImageMaturityHandler) GetImagesNeedingCheck(c *gin.Context) {
	maxAgeStr := c.DefaultQuery("maxAge", "1440")
	limitStr := c.DefaultQuery("limit", "100")

	maxAge, err := strconv.Atoi(maxAgeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid maxAge parameter",
		})
		return
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid limit parameter",
		})
		return
	}

	records, err := h.imageMaturityService.GetImagesNeedingCheck(c.Request.Context(), maxAge, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get images needing check",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
	})
}

func (h *ImageMaturityHandler) TriggerMaturityCheck(c *gin.Context) {
	err := h.imageMaturityService.ProcessImagesForMaturityCheck(c.Request.Context(), h.imageService)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to trigger maturity check",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Maturity check triggered successfully",
	})
}

func (h *ImageMaturityHandler) GetMaturityByRepository(c *gin.Context) {
	repository := c.Param("repository")

	records, err := h.imageMaturityService.GetMaturityByRepository(c.Request.Context(), repository)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get maturity by repository",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
	})
}

func (h *ImageMaturityHandler) UpdateCheckStatus(c *gin.Context) {
	imageID := c.Param("imageId")

	type UpdateStatusRequest struct {
		Status string  `json:"status" binding:"required"`
		Error  *string `json:"error,omitempty"`
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	err := h.imageMaturityService.UpdateCheckStatus(c.Request.Context(), imageID, req.Status, req.Error)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update check status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Check status updated successfully",
	})
}

func (h *ImageMaturityHandler) CleanupOrphanedRecords(c *gin.Context) {
	type CleanupRequest struct {
		ExistingImageIDs []string `json:"existingImageIds" binding:"required"`
	}

	var req CleanupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	deletedCount, err := h.imageMaturityService.CleanupOrphanedRecords(c.Request.Context(), req.ExistingImageIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to cleanup orphaned records",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"deletedCount": deletedCount,
		"message":      "Orphaned records cleaned up successfully",
	})
}

func (h *ImageMaturityHandler) CheckMaturityBatch(c *gin.Context) {
	type BatchRequest struct {
		ImageIDs []string `json:"imageIds" binding:"required"`
		Force    bool     `json:"force,omitempty"`
	}

	var req BatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	if len(req.ImageIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "At least one imageId is required",
		})
		return
	}

	result, err := h.imageMaturityService.CheckMaturityBatch(c.Request.Context(), req.ImageIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check maturity batch",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": result["results"],
		"summary": result["summary"],
		"message": "Batch maturity check completed",
	})
}
