package api

import (
	"github.com/docker/docker/api/types/volume"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
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
	driver := c.Query("driver")

	var volumes []volume.Volume
	var err error

	if driver != "" {
		volumes, err = h.volumeService.GetVolumesByDriver(c.Request.Context(), driver)
	} else {
		volumes, err = h.volumeService.ListVolumes(c.Request.Context())
	}

	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    volumes,
	})
}

func (h *VolumeHandler) GetByName(c *gin.Context) {
	name := c.Param("name")

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

	response, err := h.volumeService.CreateVolume(c.Request.Context(), options)
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
	name := c.Param("name")
	force := c.Query("force") == "true"

	if err := h.volumeService.DeleteVolume(c.Request.Context(), name, force); err != nil {
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
	name := c.Param("name")

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
