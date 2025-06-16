package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AgentResourceHandler struct {
	agentResourceService *services.AgentResourceService
}

func NewAgentResourceHandler(agentResourceService *services.AgentResourceService) *AgentResourceHandler {
	return &AgentResourceHandler{
		agentResourceService: agentResourceService,
	}
}

func (h *AgentResourceHandler) GetAllAgentResources(c *gin.Context) {
	agentID := c.Param("agentId")

	resources, err := h.agentResourceService.GetAllAgentResources(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get agent resources",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"resources": resources,
	})
}

func (h *AgentResourceHandler) GetAgentResource(c *gin.Context) {
	agentID := c.Param("agentId")
	resourceType := c.Param("resourceType")

	resource, err := h.agentResourceService.GetAgentResources(c.Request.Context(), agentID, resourceType)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Resource not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"resource": resource,
	})
}

func (h *AgentResourceHandler) SyncAgentResources(c *gin.Context) {
	agentID := c.Param("agentId")

	err := h.agentResourceService.SyncAgentResources(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to sync agent resources",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Agent resources synced successfully",
	})
}

func (h *AgentResourceHandler) GetAgentContainers(c *gin.Context) {
	agentID := c.Param("agentId")

	resource, err := h.agentResourceService.GetAgentResources(c.Request.Context(), agentID, "containers")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success":    false,
			"error":      "No container data found",
			"containers": []interface{}{},
		})
		return
	}

	containers, ok := resource.Data["containers"]
	if !ok {
		containers = []interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"containers": containers,
		"lastSync":   resource.LastSync,
		"agentId":    agentID,
	})
}

func (h *AgentResourceHandler) GetAgentImages(c *gin.Context) {
	agentID := c.Param("agentId")

	resource, err := h.agentResourceService.GetAgentResources(c.Request.Context(), agentID, "images")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "No image data found",
			"images":  []interface{}{},
		})
		return
	}

	images, ok := resource.Data["images"]
	if !ok {
		images = []interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"images":   images,
		"lastSync": resource.LastSync,
		"agentId":  agentID,
	})
}

func (h *AgentResourceHandler) GetAgentNetworks(c *gin.Context) {
	agentID := c.Param("agentId")

	resource, err := h.agentResourceService.GetAgentResources(c.Request.Context(), agentID, "networks")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success":  false,
			"error":    "No network data found",
			"networks": []interface{}{},
		})
		return
	}

	networks, ok := resource.Data["networks"]
	if !ok {
		networks = []interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"networks": networks,
		"lastSync": resource.LastSync,
		"agentId":  agentID,
	})
}

func (h *AgentResourceHandler) GetAgentVolumes(c *gin.Context) {
	agentID := c.Param("agentId")

	resource, err := h.agentResourceService.GetAgentResources(c.Request.Context(), agentID, "volumes")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "No volume data found",
			"volumes": []interface{}{},
		})
		return
	}

	volumes, ok := resource.Data["volumes"]
	if !ok {
		volumes = []interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"volumes":  volumes,
		"lastSync": resource.LastSync,
		"agentId":  agentID,
	})
}
