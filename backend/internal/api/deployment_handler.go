package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type DeploymentHandler struct {
	deploymentService *services.DeploymentService
}

func NewDeploymentHandler(deploymentService *services.DeploymentService) *DeploymentHandler {
	return &DeploymentHandler{
		deploymentService: deploymentService,
	}
}

func (h *DeploymentHandler) ListDeployments(c *gin.Context) {
	var agentID *string
	if agentParam := c.Query("agentId"); agentParam != "" {
		agentID = &agentParam
	}

	page := 1
	limit := 50
	if pageParam := c.Query("page"); pageParam != "" {
		if p, err := strconv.Atoi(pageParam); err == nil && p > 0 {
			page = p
		}
	}
	if limitParam := c.Query("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	deployments, err := h.deploymentService.ListDeployments(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch deployments",
		})
		return
	}

	total := len(deployments)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		deployments = []*models.Deployment{}
	} else {
		if end > total {
			end = total
		}
		deployments = deployments[start:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"deployments": deployments,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + limit - 1) / limit,
		},
	})
}

func (h *DeploymentHandler) GetDeployment(c *gin.Context) {
	deploymentID := c.Param("deploymentId")

	deployment, err := h.deploymentService.GetDeploymentByID(c.Request.Context(), deploymentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Deployment not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"deployment": deployment,
	})
}

func (h *DeploymentHandler) DeleteDeployment(c *gin.Context) {
	deploymentID := c.Param("deploymentId")

	err := h.deploymentService.DeleteDeployment(c.Request.Context(), deploymentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete deployment",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Deployment deleted successfully",
	})
}

func (h *DeploymentHandler) UpdateDeploymentStatus(c *gin.Context) {
	deploymentID := c.Param("deploymentId")

	type UpdateStatusRequest struct {
		Status string  `json:"status" binding:"required"`
		Error  *string `json:"error,omitempty"`
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	var status models.DeploymentStatus
	switch req.Status {
	case "pending":
		status = models.DeploymentStatusPending
	case "running":
		status = models.DeploymentStatusRunning
	case "stopped":
		status = models.DeploymentStatusStopped
	case "failed":
		status = models.DeploymentStatusFailed
	case "completed":
		status = models.DeploymentStatusCompleted
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid deployment status",
		})
		return
	}

	err := h.deploymentService.UpdateDeploymentStatus(c.Request.Context(), deploymentID, status, req.Error)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update deployment status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Deployment status updated successfully",
	})
}

func (h *DeploymentHandler) GetDeploymentStats(c *gin.Context) {
	deployments, err := h.deploymentService.ListDeployments(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch deployment statistics",
		})
		return
	}

	stats := map[string]int{
		"total":     len(deployments),
		"pending":   0,
		"running":   0,
		"stopped":   0,
		"failed":    0,
		"completed": 0,
	}

	typeStats := map[string]int{
		"stack":     0,
		"container": 0,
		"image":     0,
	}

	for _, deployment := range deployments {
		stats[string(deployment.Status)]++
		typeStats[string(deployment.Type)]++
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats": gin.H{
			"total":     stats["total"],
			"byStatus":  stats,
			"byType":    typeStats,
			"timestamp": time.Now().Unix(),
		},
	})
}

func (h *DeploymentHandler) GetRecentDeployments(c *gin.Context) {
	limit := 10
	if limitParam := c.Query("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	deployments, err := h.deploymentService.ListDeployments(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch recent deployments",
		})
		return
	}

	if len(deployments) > limit {
		deployments = deployments[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"deployments": deployments,
		"count":       len(deployments),
	})
}
