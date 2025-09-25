package api

import (
	"net/http"

	"github.com/docker/docker/api/types/volume"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type VolumeHandler struct {
	volumeService *services.VolumeService
	dockerService *services.DockerClientService
}

func NewVolumeHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, volumeService *services.VolumeService, authMiddleware *middleware.AuthMiddleware) {
	handler := &VolumeHandler{dockerService: dockerService, volumeService: volumeService}

	apiGroup := group.Group("/environments/:id/volumes")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/counts", handler.GetVolumeUsageCounts)
		apiGroup.GET("", handler.List)
		apiGroup.GET("/:volumeName", handler.GetByName)
		apiGroup.POST("", handler.Create)
		apiGroup.DELETE("/:volumeName", handler.Remove)
		apiGroup.POST("/prune", handler.Prune)
		apiGroup.GET("/:volumeName/usage", handler.GetUsage)
	}
}

func (h *VolumeHandler) List(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid pagination or sort parameters: " + err.Error()},
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

	volumes, pagination, err := h.volumeService.ListVolumesPaginated(c.Request.Context(), req, driver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to list volumes: " + err.Error()},
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

	vol, err := h.volumeService.GetVolumeByName(c.Request.Context(), name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    vol,
	})
}

func (h *VolumeHandler) Create(c *gin.Context) {
	var req dto.CreateVolumeDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request: " + err.Error()},
		})
		return
	}

	options := volume.CreateOptions{
		Name:       req.Name,
		Driver:     req.Driver,
		Labels:     req.Labels,
		DriverOpts: req.Options,
	}

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	response, err := h.volumeService.CreateVolume(c.Request.Context(), options, *currentUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *VolumeHandler) Remove(c *gin.Context) {
	name := c.Param("volumeName")
	force := c.Query("force") == "true"

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	if err := h.volumeService.DeleteVolume(c.Request.Context(), name, force, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Volume removed successfully"},
	})
}

func (h *VolumeHandler) Prune(c *gin.Context) {
	report, err := h.volumeService.PruneVolumes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    report,
	})
}

func (h *VolumeHandler) GetUsage(c *gin.Context) {
	name := c.Param("volumeName")

	inUse, containers, err := h.volumeService.GetVolumeUsage(c.Request.Context(), name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"inUse":      inUse,
			"containers": containers,
		},
	})
}

func (h *VolumeHandler) GetVolumeUsageCounts(c *gin.Context) {
	_, running, stopped, total, err := h.dockerService.GetAllVolumes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get container counts: " + err.Error()},
		})
		return
	}

	out := dto.VolumeUsageCounts{
		Inuse:  running,
		Unused: stopped,
		Total:  total,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}
