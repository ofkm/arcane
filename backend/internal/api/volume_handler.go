package api

import (
	"net/http"

	"github.com/docker/docker/api/types/volume"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type VolumeHandler struct {
	volumeService *services.VolumeService
}

func NewVolumeHandler(volumeService *services.VolumeService) *VolumeHandler {
	return &VolumeHandler{
		volumeService: volumeService,
	}
}

func (h *VolumeHandler) List(c *gin.Context) {
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

	driver := c.Query("driver")

	if req.Pagination.Page == 0 && req.Pagination.Limit == 0 {
		volumes, err := h.volumeService.ListVolumesWithUsage(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		if driver != "" {
			filtered := make([]map[string]interface{}, 0)
			for _, vol := range volumes {
				if volDriver, ok := vol["Driver"].(string); ok && volDriver == driver {
					filtered = append(filtered, vol)
				}
			}
			volumes = filtered
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    volumes,
		})
		return
	}

	volumes, pagination, err := h.volumeService.ListVolumesPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list volumes: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       volumes,
		"pagination": pagination,
	})
}

func (h *VolumeHandler) GetByName(c *gin.Context) {
	name := c.Param("volumeName")

	volume, err := h.volumeService.GetVolumeByName(c.Request.Context(), name)
	if err != nil {
		c.JSON(404, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    volume,
	})
}

func (h *VolumeHandler) Create(c *gin.Context) {
	var req struct {
		Name    string            `json:"name"`
		Driver  string            `json:"driver"`
		Labels  map[string]string `json:"labels"`
		Options map[string]string `json:"options"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	options := volume.CreateOptions{
		Name:       req.Name,
		Driver:     req.Driver,
		Labels:     req.Labels,
		DriverOpts: req.Options,
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	response, err := h.volumeService.CreateVolume(c.Request.Context(), options, *currentUser)
	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(201, gin.H{
		"success": true,
		"data":    response,
		"message": "Volume created successfully",
	})
}

func (h *VolumeHandler) Remove(c *gin.Context) {
	name := c.Param("volumeName")
	force := c.Query("force") == "true"

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if err := h.volumeService.DeleteVolume(c.Request.Context(), name, force, *currentUser); err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "Volume removed successfully",
	})
}

func (h *VolumeHandler) Prune(c *gin.Context) {
	report, err := h.volumeService.PruneVolumes(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    report,
		"message": "Volumes pruned successfully",
	})
}

func (h *VolumeHandler) GetUsage(c *gin.Context) {
	name := c.Param("volumeName")

	inUse, containers, err := h.volumeService.GetVolumeUsage(c.Request.Context(), name)
	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"inUse":      inUse,
			"containers": containers,
		},
	})
}
