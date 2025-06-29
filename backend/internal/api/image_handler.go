package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
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
	dbImages, err := h.imageService.ListImagesWithMaturity(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list images: " + err.Error(),
		})
		return
	}

	var result []map[string]interface{}

	for _, img := range dbImages {
		imageData := map[string]interface{}{
			"Id":          img.ID,
			"RepoTags":    img.RepoTags,
			"RepoDigests": img.RepoDigests,
			"Created":     img.Created.Unix(),
			"Size":        img.Size,
			"VirtualSize": img.VirtualSize,
			"Labels":      img.Labels,
			"InUse":       img.InUse,
		}

		if img.MaturityRecord != nil {
			imageData["maturity"] = map[string]interface{}{
				"updatesAvailable": img.MaturityRecord.UpdatesAvailable,
				"status":           img.MaturityRecord.Status,
				"version":          img.MaturityRecord.CurrentVersion,
				"date":             img.MaturityRecord.CurrentImageDate,
			}
		} else if len(img.RepoTags) > 0 && img.RepoTags[0] != "<none>:<none>" && img.Repo != "<none>" && h.imageMaturityService != nil {
			go func(imageID string, repo string, tag string, createdTime time.Time) {
				maturityData, checkErr := h.imageMaturityService.CheckImageMaturity(context.Background(), imageID, repo, tag, createdTime, nil)
				if checkErr == nil {
					setErr := h.imageMaturityService.SetImageMaturity(context.Background(), imageID, repo, tag, *maturityData, map[string]interface{}{
						"registryDomain":    utils.ExtractRegistryDomain(repo),
						"isPrivateRegistry": utils.IsPrivateRegistry(repo),
						"currentImageDate":  createdTime,
					})
					if setErr != nil {
						fmt.Printf("Error setting image maturity for %s: %v\n", imageID, setErr)
					}
				} else {
					fmt.Printf("Error checking image maturity for %s (%s:%s): %v\n", imageID, repo, tag, checkErr)
				}
			}(img.ID, img.Repo, img.Tag, img.Created)
		}
		result = append(result, imageData)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
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

	maturityData, err := h.imageMaturityService.CheckImageMaturity(c.Request.Context(), imageID, repo, tag, time.Unix(targetImage.Created, 0), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check maturity: " + err.Error(),
		})
		return
	}

	errSet := h.imageMaturityService.SetImageMaturity(c.Request.Context(), imageID, repo, tag, *maturityData, map[string]interface{}{
		"registryDomain":    utils.ExtractRegistryDomain(repo),
		"isPrivateRegistry": utils.IsPrivateRegistry(repo),
		"currentImageDate":  time.Unix(targetImage.Created, 0),
	})
	if errSet != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to set image maturity: " + errSet.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    maturityData,
	})
}
