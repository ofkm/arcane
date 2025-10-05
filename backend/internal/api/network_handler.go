package api

import (
	"net/http"

	"github.com/docker/docker/api/types/network"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type NetworkHandler struct {
	networkService *services.NetworkService
	dockerService  *services.DockerClientService
}

func NewNetworkHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, networkService *services.NetworkService, authMiddleware *middleware.AuthMiddleware) {
	handler := &NetworkHandler{dockerService: dockerService, networkService: networkService}

	apiGroup := group.Group("/environments/:id/networks")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/counts", handler.GetNetworkUsageCounts)
		apiGroup.GET("", handler.List)
		apiGroup.GET("/:networkId", handler.GetByID)
		apiGroup.POST("", handler.Create)
		apiGroup.DELETE("/:networkId", handler.Remove)
		apiGroup.POST("/prune", handler.Prune)
	}
}

func (h *NetworkHandler) List(c *gin.Context) {
	params := pagination.ExtractListModifiersQueryParams(c)

	if params.Limit == 0 {
		params.Limit = 20
	}

	networks, paginationResp, err := h.networkService.ListNetworksPaginated(c.Request.Context(), params)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	pagination.ApplyFilterResultsHeaders(&c.Writer, pagination.FilterResult[dto.NetworkSummaryDto]{
		Items:          networks,
		TotalCount:     int(paginationResp.TotalItems),
		TotalAvailable: int(paginationResp.GrandTotalItems),
	})

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       networks,
		"pagination": paginationResp,
	})
}

func (h *NetworkHandler) GetByID(c *gin.Context) {
	id := c.Param("networkId")

	networkInspect, err := h.networkService.GetNetworkByID(c.Request.Context(), id)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	out, mapErr := dto.MapOne[network.Inspect, dto.NetworkInspectDto](*networkInspect)
	if mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *NetworkHandler) Create(c *gin.Context) {
	var req struct {
		Name    string                `json:"name" binding:"required"`
		Options network.CreateOptions `json:"options"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, err.Error())
		return
	}

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	response, err := h.networkService.CreateNetwork(c.Request.Context(), req.Name, req.Options, *currentUser)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	out, mapErr := dto.MapOne[network.CreateResponse, dto.NetworkCreateResponseDto](*response)
	if mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusCreated, out)
}

func (h *NetworkHandler) Remove(c *gin.Context) {
	id := c.Param("networkId")

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	if err := h.networkService.RemoveNetwork(c.Request.Context(), id, *currentUser); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Network removed successfully")
}

func (h *NetworkHandler) GetNetworkUsageCounts(c *gin.Context) {
	_, running, stopped, total, err := h.dockerService.GetAllNetworks(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	out := dto.NetworkUsageCounts{
		Inuse:  running,
		Unused: stopped,
		Total:  total,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *NetworkHandler) Prune(c *gin.Context) {
	report, err := h.networkService.PruneNetworks(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	out, mapErr := dto.MapOne[network.PruneReport, dto.NetworkPruneReportDto](*report)
	if mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}
