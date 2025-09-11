package api

import (
	"net/http"

	"github.com/docker/docker/api/types/network"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type NetworkHandler struct {
	networkService *services.NetworkService
	dockerService  *services.DockerClientService
}

func NewNetworkHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, networkService *services.NetworkService, authMiddleware *middleware.AuthMiddleware) {
	handler := &NetworkHandler{dockerService: dockerService, networkService: networkService}

	apiGroup := group.Group("/networks")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("", handler.List)
		apiGroup.GET("/:id", handler.GetByID)
		apiGroup.POST("", handler.Create)
		apiGroup.DELETE("/:id", handler.Remove)
		apiGroup.POST("/prune", handler.Prune)
	}
}

func (h *NetworkHandler) List(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: "Invalid pagination or sort parameters: " + err.Error()},
		})
		return
	}

	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	networks, pagination, err := h.networkService.ListNetworksPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: "Failed to list networks: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       networks,
		"pagination": pagination,
	})
}

func (h *NetworkHandler) GetByID(c *gin.Context) {
	id := c.Param("networkId")

	networkInspect, err := h.networkService.GetNetworkByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	out, mapErr := dto.MapOne[network.Inspect, dto.NetworkInspectDto](*networkInspect)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": dto.MessageDto{Message: mapErr.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *NetworkHandler) Create(c *gin.Context) {
	var req struct {
		Name    string                `json:"name" binding:"required"`
		Options network.CreateOptions `json:"options"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": dto.MessageDto{Message: "User not authenticated"}})
		return
	}
	response, err := h.networkService.CreateNetwork(c.Request.Context(), req.Name, req.Options, *currentUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	out, mapErr := dto.MapOne[network.CreateResponse, dto.NetworkCreateResponseDto](*response)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": dto.MessageDto{Message: mapErr.Error()}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *NetworkHandler) Remove(c *gin.Context) {
	id := c.Param("networkId")

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": dto.MessageDto{Message: "User not authenticated"}})
		return
	}
	if err := h.networkService.RemoveNetwork(c.Request.Context(), id, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dto.MessageDto{Message: "Network removed successfully"},
	})
}

func (h *NetworkHandler) GetNetworkUsageCounts(c *gin.Context) {
	_, running, stopped, total, err := h.dockerService.GetAllNetworks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get container counts: " + err.Error()},
		})
		return
	}

	out := dto.NetworkUsageCounts{
		Inuse:  running,
		Unused: stopped,
		Total:  total,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *NetworkHandler) Prune(c *gin.Context) {
	report, err := h.networkService.PruneNetworks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    dto.MessageDto{Message: err.Error()},
		})
		return
	}

	out, mapErr := dto.MapOne[network.PruneReport, dto.NetworkPruneReportDto](*report)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": dto.MessageDto{Message: mapErr.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}
