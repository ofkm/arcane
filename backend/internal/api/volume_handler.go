package api

import (
	"net/http"

	"github.com/docker/docker/api/types/volume"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
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
	params := pagination.ExtractListModifiersQueryParams(c)

	if params.Limit == 0 {
		params.Limit = 20
	}

	volumes, paginationResp, err := h.volumeService.ListVolumesPaginated(c.Request.Context(), params)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	pagination.ApplyFilterResultsHeaders(&c.Writer, pagination.FilterResult[dto.VolumeDto]{
		Items:          volumes,
		TotalCount:     int(paginationResp.TotalItems),
		TotalAvailable: int(paginationResp.GrandTotalItems),
	})

	response := gin.H{
		"items":      volumes,
		"pagination": paginationResp,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *VolumeHandler) GetByName(c *gin.Context) {
	name := c.Param("volumeName")

	vol, err := h.volumeService.GetVolumeByName(c.Request.Context(), name)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, vol)
}

func (h *VolumeHandler) Create(c *gin.Context) {
	var req dto.CreateVolumeDto
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request: "+err.Error())
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
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusCreated, response)
}

func (h *VolumeHandler) Remove(c *gin.Context) {
	name := c.Param("volumeName")
	force := c.Query("force") == "true"

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	if err := h.volumeService.DeleteVolume(c.Request.Context(), name, force, *currentUser); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Volume removed successfully")
}

func (h *VolumeHandler) Prune(c *gin.Context) {
	report, err := h.volumeService.PruneVolumes(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, report)
}

func (h *VolumeHandler) GetUsage(c *gin.Context) {
	name := c.Param("volumeName")

	inUse, containers, err := h.volumeService.GetVolumeUsage(c.Request.Context(), name)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	response := gin.H{
		"inUse":      inUse,
		"containers": containers,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *VolumeHandler) GetVolumeUsageCounts(c *gin.Context) {
	_, running, stopped, total, err := h.dockerService.GetAllVolumes(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	out := dto.VolumeUsageCounts{
		Inuse:  running,
		Unused: stopped,
		Total:  total,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}
