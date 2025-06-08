package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ImageHandler struct {
	imageService         *services.ImageService
	imageMaturityService *services.ImageMaturityService
}

func NewImageHandler(imageService *services.ImageService, imageMaturityService *services.ImageMaturityService) *ImageHandler {
	return &ImageHandler{
		imageService:         imageService,
		imageMaturityService: imageMaturityService,
	}
}

func (h *ImageHandler) List(c *gin.Context) {
	images, err := h.imageService.ListImages(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list images: " + err.Error(),
		})
		return
	}

	var result []map[string]interface{}

	for _, img := range images {
		imageData := map[string]interface{}{
			"Id":          img.ID,
			"ParentId":    img.ParentID,
			"RepoTags":    img.RepoTags,
			"RepoDigests": img.RepoDigests,
			"Created":     img.Created,
			"Size":        img.Size,
			"VirtualSize": img.VirtualSize,
			"SharedSize":  img.SharedSize,
			"Labels":      img.Labels,
			"Containers":  img.Containers,
		}

		if h.imageMaturityService != nil {
			maturityRecord, err := h.imageMaturityService.GetImageMaturity(c.Request.Context(), img.ID)
			if err == nil {
				imageData["maturity"] = map[string]interface{}{
					"updatesAvailable": maturityRecord.UpdatesAvailable,
					"status":           maturityRecord.Status,
					"version":          maturityRecord.CurrentVersion,
					"date":             maturityRecord.CurrentImageDate,
				}
			} else {
				if len(img.RepoTags) > 0 && img.RepoTags[0] != "<none>:<none>" {
					go func(imageID string, repoTags []string) {
						repoTag := repoTags[0]
						parts := strings.Split(repoTag, ":")
						if len(parts) == 2 {
							repo := parts[0]
							tag := parts[1]

							maturityData, err := h.imageMaturityService.CheckImageInRegistry(context.Background(), repo, tag, imageID)
							if err == nil {
								h.imageMaturityService.SetImageMaturity(context.Background(), imageID, repo, tag, *maturityData, map[string]interface{}{
									"registryDomain":    h.imageMaturityService.ExtractRegistryDomain(repo),
									"isPrivateRegistry": h.imageMaturityService.IsPrivateRegistry(repo),
									"currentImageDate":  time.Unix(img.Created, 0),
								})
							}
						}
					}(img.ID, img.RepoTags)
				}
			}
		}

		result = append(result, imageData)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *ImageHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

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
	id := c.Param("id")
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
	var req struct {
		ImageName string `json:"imageName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.imageService.PullImage(c.Request.Context(), req.ImageName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image pulled successfully",
	})
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

func (h *ImageHandler) CheckMaturity(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Image ID is required",
		})
		return
	}

	images, err := h.imageService.ListImages(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list images: " + err.Error(),
		})
		return
	}

	var targetImage *struct {
		ID       string
		RepoTags []string
		Created  int64
	}

	for _, img := range images {
		if img.ID == imageID {
			targetImage = &struct {
				ID       string
				RepoTags []string
				Created  int64
			}{
				ID:       img.ID,
				RepoTags: img.RepoTags,
				Created:  img.Created,
			}
			break
		}
	}

	if targetImage == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Image not found",
		})
		return
	}

	if len(targetImage.RepoTags) == 0 || targetImage.RepoTags[0] == "<none>:<none>" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Image has no valid tags for maturity checking",
		})
		return
	}

	repoTag := targetImage.RepoTags[0]
	parts := strings.Split(repoTag, ":")
	if len(parts) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid repo tag format",
		})
		return
	}

	repo := parts[0]
	tag := parts[1]

	maturityData, err := h.imageMaturityService.CheckImageInRegistry(c.Request.Context(), repo, tag, imageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check maturity: " + err.Error(),
		})
		return
	}

	err = h.imageMaturityService.SetImageMaturity(c.Request.Context(), imageID, repo, tag, *maturityData, map[string]interface{}{
		"registryDomain":    h.imageMaturityService.ExtractRegistryDomain(repo),
		"isPrivateRegistry": h.imageMaturityService.IsPrivateRegistry(repo),
		"currentImageDate":  time.Unix(targetImage.Created, 0),
	})
	if err != nil {
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    maturityData,
	})
}
