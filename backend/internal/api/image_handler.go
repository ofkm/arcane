package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type ImageHandler struct {
	imageService       *services.ImageService
	imageUpdateService *services.ImageUpdateService
	dockerService      *services.DockerClientService
}

func NewImageHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, imageService *services.ImageService, imageUpdateService *services.ImageUpdateService, authMiddleware *middleware.AuthMiddleware) {
	handler := &ImageHandler{dockerService: dockerService, imageService: imageService, imageUpdateService: imageUpdateService}

	apiGroup := group.Group("/environments/:id/images")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/counts", handler.GetImageUsageCounts)
		apiGroup.GET("", handler.List)
		apiGroup.GET("/:imageId", handler.GetByID)
		apiGroup.DELETE("/:imageId", handler.Remove)
		apiGroup.POST("/pull", handler.Pull)
		apiGroup.POST("/prune", handler.Prune)
	}
}

func (h *ImageHandler) List(c *gin.Context) {
	params := pagination.ExtractListModifiersQueryParams(c)

	if params.Limit == 0 {
		params.Limit = 20
	}

	images, paginationResp, err := h.imageService.ListImagesPaginated(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: "Failed to list images: " + err.Error()},
		})
		return
	}

	pagination.ApplyFilterResultsHeaders(&c.Writer, pagination.FilterResult[dto.ImageSummaryDto]{
		Items:          images,
		TotalCount:     paginationResp.TotalItems,
		TotalAvailable: paginationResp.GrandTotalItems,
	})

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       images,
		"pagination": paginationResp,
	})
}

func (h *ImageHandler) GetByID(c *gin.Context) {
	id := c.Param("imageId")

	img, err := h.imageService.GetImageByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": dto.MessageDto{Message: err.Error()}})
		return
	}

	out := dto.NewImageDetailSummaryDto(img)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *ImageHandler) Remove(c *gin.Context) {
	id := c.Param("imageId")
	force := c.Query("force") == "true"

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	if err := h.imageService.RemoveImage(c.Request.Context(), id, force, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dto.MessageDto{Message: "Image removed successfully"},
	})
}

func (h *ImageHandler) Pull(c *gin.Context) {
	ctx := c.Request.Context()
	var req dto.ImagePullDto

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: "Invalid request body: " + err.Error()},
		})
		return
	}

	c.Writer.Header().Set("Content-Type", "application/x-json-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	if err := h.imageService.PullImage(ctx, req.ImageName, c.Writer, *currentUser, req.Credentials); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: fmt.Sprintf("Failed to pull image '%s': %s", req.ImageName, err.Error())},
		})
		return
	}

	slog.InfoContext(ctx, "Image pull stream completed",
		slog.String("imageName", req.ImageName))
}

func (h *ImageHandler) Prune(c *gin.Context) {
	dangling := c.Query("dangling") == "true"

	var req struct {
		Dangling *bool               `json:"dangling"`
		Filters  map[string][]string `json:"filters"`
	}
	if err := c.ShouldBindJSON(&req); err == nil {
		if req.Dangling != nil {
			dangling = *req.Dangling
		} else if vals, ok := req.Filters["dangling"]; ok {
			for _, v := range vals {
				if v == "true" || v == "1" {
					dangling = true
					break
				}
			}
		}
	}

	slog.DebugContext(c.Request.Context(), "Image prune request", slog.Bool("dangling_only", dangling))

	report, err := h.imageService.PruneImages(c.Request.Context(), dangling)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	out := dto.NewImagePruneReportDto(*report)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

func (h *ImageHandler) GetImageUsageCounts(c *gin.Context) {
	ctx := c.Request.Context()

	var (
		inuse, unused, total int
		totalSize            int64
		errs                 []error
	)

	_, iu, un, tot, err := h.dockerService.GetAllImages(ctx)
	if err != nil {
		errs = append(errs, fmt.Errorf("get images: %w", err))
	} else {
		inuse, unused, total = iu, un, tot
	}

	sz, err := h.imageService.GetTotalImageSize(ctx)
	if err != nil {
		errs = append(errs, fmt.Errorf("get total image size: %w", err))
	} else {
		totalSize = sz
	}

	if len(errs) > 0 {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: errors.Join(errs...).Error()},
		})
		return
	}

	out := dto.ImageUsageCountsDto{
		Inuse:     inuse,
		Unused:    unused,
		Total:     total,
		TotalSize: totalSize,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}
