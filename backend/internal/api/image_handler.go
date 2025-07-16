package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type ImageHandler struct {
	imageService       *services.ImageService
	imageUpdateService *services.ImageUpdateService
}

func NewImageHandler(imageService *services.ImageService, imageUpdateService *services.ImageUpdateService) *ImageHandler {
	return &ImageHandler{
		imageService:       imageService,
		imageUpdateService: imageUpdateService,
	}
}

func (h *ImageHandler) List(c *gin.Context) {
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

	images, pagination, err := h.imageService.ListImagesWithUpdatesPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list images: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       images,
		"pagination": pagination,
	})
}

func (h *ImageHandler) GetByID(c *gin.Context) {
	id := c.Param("imageId")

	image, err := h.imageService.GetImageByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    image,
	})
}

func (h *ImageHandler) Remove(c *gin.Context) {
	id := c.Param("imageId")
	force := c.Query("force") == "true"

	if err := h.imageService.RemoveImage(c.Request.Context(), id, force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image removed successfully",
	})
}

func (h *ImageHandler) Pull(c *gin.Context) {
	var req dto.ImagePullDto

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	c.Writer.Header().Set("Content-Type", "application/x-json-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	err := h.imageService.PullImage(c.Request.Context(), req.ImageName, c.Writer)

	if err != nil {
		if !c.Writer.Written() {
			if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "manifest unknown") {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   fmt.Sprintf("Failed to pull image '%s': %s. Ensure the image name and tag are correct and the image exists in the registry.", req.ImageName, err.Error()),
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   fmt.Sprintf("Failed to pull image '%s': %s", req.ImageName, err.Error()),
				})
			}
		} else {
			slog.Error("Error during image pull stream or post-stream operation", "imageName", req.ImageName, "error", err.Error())
			fmt.Fprintf(c.Writer, `{"error": {"code": 500, "message": "Stream interrupted or post-stream operation failed: %s"}}\n`, strings.ReplaceAll(err.Error(), "\"", "'"))
			if flusher, ok := c.Writer.(http.Flusher); ok {
				flusher.Flush()
			}
		}
		return
	}

	slog.Info("Image pull stream completed and database sync attempted", "imageName", req.ImageName)
}

func (h *ImageHandler) Prune(c *gin.Context) {
	dangling := c.Query("dangling") == "true"

	report, err := h.imageService.PruneImages(c.Request.Context(), dangling)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    report,
	})
}

func (h *ImageHandler) GetHistory(c *gin.Context) {
	id := c.Param("id")

	history, err := h.imageService.GetImageHistory(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    history,
	})
}
