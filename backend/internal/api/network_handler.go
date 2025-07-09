package api

import (
	"net/http"

	"github.com/docker/docker/api/types/network"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type NetworkHandler struct {
	networkService *services.NetworkService
}

func NewNetworkHandler(networkService *services.NetworkService) *NetworkHandler {
	return &NetworkHandler{
		networkService: networkService,
	}
}

func (h *NetworkHandler) List(c *gin.Context) {
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
	scope := c.Query("scope")
	userDefined := c.Query("user_defined") == "true"
	defaults := c.Query("defaults") == "true"

	if req.Pagination.Page == 0 && req.Pagination.Limit == 0 {
		var networks []network.Summary
		var err error

		switch {
		case driver != "":
			networks, err = h.networkService.GetNetworksByDriver(c.Request.Context(), driver)
		case scope != "":
			networks, err = h.networkService.GetNetworksByScope(c.Request.Context(), scope)
		case userDefined:
			networks, err = h.networkService.GetUserDefinedNetworks(c.Request.Context())
		case defaults:
			networks, err = h.networkService.GetDefaultNetworks(c.Request.Context())
		default:
			networks, err = h.networkService.ListNetworks(c.Request.Context())
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    networks,
		})
		return
	}

	networks, pagination, err := h.networkService.ListNetworksPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list networks: " + err.Error(),
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

	network, err := h.networkService.GetNetworkByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    network,
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
			"error":   err.Error(),
		})
		return
	}

	response, err := h.networkService.CreateNetwork(c.Request.Context(), req.Name, req.Options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *NetworkHandler) Remove(c *gin.Context) {
	id := c.Param("networkId")

	if err := h.networkService.RemoveNetwork(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Network removed successfully",
	})
}

func (h *NetworkHandler) ConnectContainer(c *gin.Context) {
	networkID := c.Param("networkId")

	var req struct {
		ContainerID string                    `json:"containerId" binding:"required"`
		Config      *network.EndpointSettings `json:"config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.networkService.ConnectContainer(c.Request.Context(), networkID, req.ContainerID, req.Config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container connected to network successfully",
	})
}

func (h *NetworkHandler) DisconnectContainer(c *gin.Context) {
	networkID := c.Param("networkId")

	var req struct {
		ContainerID string `json:"containerId" binding:"required"`
		Force       bool   `json:"force"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.networkService.DisconnectContainer(c.Request.Context(), networkID, req.ContainerID, req.Force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container disconnected from network successfully",
	})
}

func (h *NetworkHandler) Prune(c *gin.Context) {
	report, err := h.networkService.PruneNetworks(c.Request.Context())
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
