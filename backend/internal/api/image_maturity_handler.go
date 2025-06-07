package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ImageMaturityHandler struct {
	imageMaturityService *services.ImageMaturityService
}

func NewImageMaturityHandler(imageMaturityService *services.ImageMaturityService) *ImageMaturityHandler {
	return &ImageMaturityHandler{
		imageMaturityService: imageMaturityService,
	}
}

// MarkAsMatured marks an image as matured.
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

	// Validate the daysSinceCreation value
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
	imageID := c.Param("imageId")

	record, err := h.imageMaturityService.GetImageMaturity(c.Request.Context(), imageID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Image maturity record not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"record":  record,
	})
}

type SetMaturityRequest struct {
	Repository       string                 `json:"repository" binding:"required"`
	Tag              string                 `json:"tag" binding:"required"`
	Version          string                 `json:"version" binding:"required"`
	Date             string                 `json:"date"`
	Status           string                 `json:"status" binding:"required"`
	UpdatesAvailable bool                   `json:"updatesAvailable"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

func (h *ImageMaturityHandler) SetImageMaturity(c *gin.Context) {
	imageID := c.Param("imageId")

	var req SetMaturityRequest
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
	// Optional repository filter
	repository := c.Query("repository")

	var records []*models.ImageMaturityRecord
	var err error

	if repository != "" {
		records, err = h.imageMaturityService.GetMaturityByRepository(c.Request.Context(), repository)
	} else {
		records, err = h.imageMaturityService.ListAllMaturityRecords(c.Request.Context())
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch maturity records",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"records": records,
		"count":   len(records),
	})
}

func (h *ImageMaturityHandler) GetImagesWithUpdates(c *gin.Context) {
	records, err := h.imageMaturityService.GetImagesWithUpdates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch images with updates",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"records": records,
		"count":   len(records),
	})
}

func (h *ImageMaturityHandler) GetMaturityStats(c *gin.Context) {
	stats, err := h.imageMaturityService.GetMaturityStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch maturity statistics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}

func (h *ImageMaturityHandler) GetImagesNeedingCheck(c *gin.Context) {
	maxAge := 60 // Default 1 hour
	limit := 50  // Default limit

	if maxAgeParam := c.Query("maxAgeMinutes"); maxAgeParam != "" {
		if m, err := strconv.Atoi(maxAgeParam); err == nil && m > 0 {
			maxAge = m
		}
	}

	if limitParam := c.Query("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	records, err := h.imageMaturityService.GetImagesNeedingCheck(c.Request.Context(), maxAge, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch images needing check",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"records": records,
		"count":   len(records),
		"params": gin.H{
			"maxAgeMinutes": maxAge,
			"limit":         limit,
		},
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

	// Process each image in the batch
	results := make(map[string]interface{})
	successCount := 0

	for _, imageID := range req.ImageIDs {
		// Use proper status constant instead of "Checked"
		err := h.imageMaturityService.UpdateCheckStatus(c.Request.Context(), imageID, models.ImageStatusChecking, nil)
		if err != nil {
			results[imageID] = gin.H{
				"success": false,
				"error":   err.Error(),
			}
		} else {
			results[imageID] = gin.H{
				"success":    true,
				"status":     models.ImageStatusChecking,
				"checked_at": time.Now(),
			}
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": results,
		"summary": gin.H{
			"total":      len(req.ImageIDs),
			"successful": successCount,
			"failed":     len(req.ImageIDs) - successCount,
		},
		"message": "Batch maturity check completed",
	})
}
