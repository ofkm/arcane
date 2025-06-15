package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AgentHandler struct {
	agentService      *services.AgentService
	deploymentService *services.DeploymentService
}

func NewAgentHandler(agentService *services.AgentService, deploymentService *services.DeploymentService) *AgentHandler {
	return &AgentHandler{
		agentService:      agentService,
		deploymentService: deploymentService,
	}
}

func (h *AgentHandler) RegisterAgent(c *gin.Context) {
	var req dto.RegisterAgentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	agent := &models.Agent{
		ID:           req.ID,
		Name:         req.Hostname,
		Hostname:     req.Hostname,
		URL:          "http://" + req.Hostname,
		Platform:     req.Platform,
		Version:      req.Version,
		Capabilities: models.StringSlice(req.Capabilities),
	}

	registeredAgent, err := h.agentService.RegisterAgent(c.Request.Context(), agent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to register agent: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"agent":   registeredAgent,
		"message": "Agent registered successfully",
	})
}

func (h *AgentHandler) Heartbeat(c *gin.Context) {
	agentID := c.Param("agentId")

	var req dto.HeartbeatDto
	if err := c.ShouldBindJSON(&req); err != nil {
		if err := h.agentService.UpdateAgentHeartbeat(c.Request.Context(), agentID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update heartbeat",
			})
			return
		}
	} else {
		if err := h.agentService.UpdateAgentMetrics(c.Request.Context(), agentID, req.Metrics, req.Docker); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update agent metrics",
			})
			return
		}
	}

	pendingTasks, err := h.agentService.GetPendingTasks(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get pending tasks",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Heartbeat received",
		"pendingTasks": pendingTasks,
	})
}

func (h *AgentHandler) GetPendingTasks(c *gin.Context) {
	agentID := c.Param("agentId")

	tasks, err := h.agentService.GetPendingTasks(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get pending tasks",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"tasks":   tasks,
		"count":   len(tasks),
	})
}

func (h *AgentHandler) ListAgents(c *gin.Context) {
	agents, err := h.agentService.ListAgentsWithStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch agents",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"agents":  agents,
		"count":   len(agents),
	})
}

func (h *AgentHandler) GetAgent(c *gin.Context) {
	agentID := c.Param("agentId")

	agent, err := h.agentService.GetAgentByIDWithStatus(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Agent not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"agent":   agent,
	})
}

func (h *AgentHandler) DeleteAgent(c *gin.Context) {
	agentID := c.Param("agentId")

	err := h.agentService.DeleteAgent(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete agent",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Agent deleted successfully",
	})
}

type CreateTaskRequest struct {
	Type    models.AgentTaskType   `json:"type" binding:"required"`
	Payload map[string]interface{} `json:"payload" binding:"required"`
}

func (h *AgentHandler) GetAgentTasks(c *gin.Context) {
	agentID := c.Param("agentId")

	tasks, err := h.agentService.ListTasks(c.Request.Context(), &agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch tasks",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"tasks":   tasks,
		"count":   len(tasks),
	})
}

func (h *AgentHandler) CreateTask(c *gin.Context) {
	agentID := c.Param("agentId")

	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	task, err := h.agentService.CreateTask(c.Request.Context(), agentID, req.Type, req.Payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create task",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"task":    task,
	})
}

func (h *AgentHandler) GetTask(c *gin.Context) {
	taskID := c.Param("taskId")

	task, err := h.agentService.GetTaskByID(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Task not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

func (h *AgentHandler) SubmitTaskResult(c *gin.Context) {
	taskID := c.Param("taskId")

	var req dto.SubmitTaskResultDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	err := h.agentService.UpdateTaskStatus(c.Request.Context(), taskID, req.Status, req.Result, req.Error)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update task status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task result submitted successfully",
	})
}

func (h *AgentHandler) GetAgentDeployments(c *gin.Context) {
	agentID := c.Param("agentId")

	deployments, err := h.deploymentService.ListDeployments(c.Request.Context(), &agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch deployments",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"deployments": deployments,
		"count":       len(deployments),
	})
}

func (h *AgentHandler) DeployStack(c *gin.Context) {
	agentID := c.Param("agentId")

	var req dto.DeployAgentStackDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	task, err := h.agentService.DeployStackToAgent(c.Request.Context(), agentID, req.StackName, req.ComposeContent, req.EnvContent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create deployment task",
		})
		return
	}

	deployment, err := h.deploymentService.CreateStackDeployment(c.Request.Context(), agentID, req.StackName, req.ComposeContent, req.EnvContent, &task.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create deployment record",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"deployment": deployment,
		"task":       task,
	})
}

func (h *AgentHandler) DeployContainer(c *gin.Context) {
	agentID := c.Param("agentId")

	var req dto.DeployAgentContainerDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	payload := map[string]interface{}{
		"containerName": req.ContainerName,
		"imageName":     req.ImageName,
		"ports":         req.Ports,
		"volumes":       req.Volumes,
		"environment":   req.Environment,
	}

	task, err := h.agentService.CreateTask(c.Request.Context(), agentID, models.TaskContainerStart, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create deployment task",
		})
		return
	}

	deployment, err := h.deploymentService.CreateContainerDeployment(c.Request.Context(), agentID, req.ContainerName, req.ImageName, req.Ports, req.Volumes, &task.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create deployment record",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"deployment": deployment,
		"task":       task,
	})
}

func (h *AgentHandler) DeployImage(c *gin.Context) {
	agentID := c.Param("agentId")

	var req dto.DeployAgentImageDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	task, err := h.agentService.PullImageOnAgent(c.Request.Context(), agentID, req.ImageName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create image pull task",
		})
		return
	}

	deployment, err := h.deploymentService.CreateImageDeployment(c.Request.Context(), agentID, req.ImageName, &task.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create deployment record",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"deployment": deployment,
		"task":       task,
	})
}

func (h *AgentHandler) GetAgentStacks(c *gin.Context) {
	agentID := c.Param("agentId")

	stacks := []interface{}{}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stacks":  stacks,
		"count":   len(stacks),
		"agentId": agentID,
	})
}

func (h *AgentHandler) SendHealthCheck(c *gin.Context) {
	agentID := c.Param("agentId")

	task, err := h.agentService.SendHealthCheck(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to send health check",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

func (h *AgentHandler) GetStackList(c *gin.Context) {
	agentID := c.Param("agentId")

	task, err := h.agentService.GetStackList(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to request stack list",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}
