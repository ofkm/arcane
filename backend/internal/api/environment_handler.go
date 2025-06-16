package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

const LOCAL_DOCKER_ENVIRONMENT_ID = "0"

type EnvironmentHandler struct {
	environmentService *services.EnvironmentService
	containerService   *services.ContainerService
	imageService       *services.ImageService
	networkService     *services.NetworkService
	volumeService      *services.VolumeService
	stackService       *services.StackService
}

func NewEnvironmentHandler(
	environmentService *services.EnvironmentService,
	containerService *services.ContainerService,
	imageService *services.ImageService,
	networkService *services.NetworkService,
	volumeService *services.VolumeService,
	stackService *services.StackService,
) *EnvironmentHandler {
	return &EnvironmentHandler{
		environmentService: environmentService,
		containerService:   containerService,
		imageService:       imageService,
		networkService:     networkService,
		volumeService:      volumeService,
		stackService:       stackService,
	}
}

func (h *EnvironmentHandler) routeRequest(c *gin.Context, endpoint string) {
	environmentID := c.Param("id")

	if environmentID == LOCAL_DOCKER_ENVIRONMENT_ID {
		h.handleLocalRequest(c, endpoint)
		return
	}

	h.handleRemoteRequest(c, environmentID, endpoint)
}

func (h *EnvironmentHandler) handleLocalRequest(c *gin.Context, endpoint string) {
	switch endpoint {
	case "/containers":
		if c.Request.Method == "GET" {
			containerHandler := NewContainerHandler(h.containerService)
			containerHandler.List(c)
		} else if c.Request.Method == "POST" {
			containerHandler := NewContainerHandler(h.containerService)
			containerHandler.Create(c)
		}
	case "/images":
		if c.Request.Method == "GET" {
			imageHandler := NewImageHandler(h.imageService, nil)
			imageHandler.List(c)
		}
	case "/networks":
		if c.Request.Method == "GET" {
			networkHandler := NewNetworkHandler(h.networkService)
			networkHandler.List(c)
		} else if c.Request.Method == "POST" {
			networkHandler := NewNetworkHandler(h.networkService)
			networkHandler.Create(c)
		}
	case "/volumes":
		if c.Request.Method == "GET" {
			volumeHandler := NewVolumeHandler(h.volumeService)
			volumeHandler.List(c)
		} else if c.Request.Method == "POST" {
			volumeHandler := NewVolumeHandler(h.volumeService)
			volumeHandler.Create(c)
		}
	case "/stacks":
		if c.Request.Method == "GET" {
			stackHandler := NewStackHandler(h.stackService)
			stackHandler.ListStacks(c)
		} else if c.Request.Method == "POST" {
			stackHandler := NewStackHandler(h.stackService)
			stackHandler.CreateStack(c)
		}
	default:
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Endpoint not found",
		})
	}
}

func (h *EnvironmentHandler) handleRemoteRequest(c *gin.Context, environmentID string, endpoint string) {
	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Environment not found",
		})
		return
	}

	if !environment.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Environment is disabled",
		})
		return
	}

	client := &http.Client{Timeout: 30 * time.Second}
	url := environment.ApiUrl + "/api" + endpoint

	var reqBody io.Reader
	if c.Request.Body != nil {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err == nil && len(bodyBytes) > 0 {
			reqBody = bytes.NewBuffer(bodyBytes)
		}
	}

	req, err := http.NewRequest(c.Request.Method, url, reqBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create request",
		})
		return
	}

	for key, values := range c.Request.Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	for key, values := range c.Request.URL.Query() {
		for _, value := range values {
			q := req.URL.Query()
			q.Add(key, value)
			req.URL.RawQuery = q.Encode()
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		h.environmentService.UpdateEnvironmentStatus(c.Request.Context(), environmentID, "offline")
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to connect to environment: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	h.environmentService.UpdateEnvironmentHeartbeat(c.Request.Context(), environmentID)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to read response",
		})
		return
	}

	for key, values := range resp.Header {
		for _, value := range values {
			c.Header(key, value)
		}
	}

	c.Status(resp.StatusCode)
	c.Writer.Write(responseBody)
}

func (h *EnvironmentHandler) CreateEnvironment(c *gin.Context) {
	var req dto.CreateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	environment := &models.Environment{
		Hostname:    req.Hostname,
		ApiUrl:      req.ApiUrl,
		Description: req.Description,
		Enabled:     true,
	}

	if req.Enabled != nil {
		environment.Enabled = *req.Enabled
	}

	createdEnvironment, err := h.environmentService.CreateEnvironment(c.Request.Context(), environment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create environment: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":     true,
		"environment": createdEnvironment,
		"message":     "Environment created successfully",
	})
}

func (h *EnvironmentHandler) ListEnvironments(c *gin.Context) {
	environments, err := h.environmentService.ListEnvironments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch environments",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"environments": environments,
		"count":        len(environments),
	})
}

func (h *EnvironmentHandler) GetEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Environment not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": environment,
	})
}

func (h *EnvironmentHandler) UpdateEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	var req dto.UpdateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	updates := make(map[string]interface{})
	if req.Hostname != nil {
		updates["hostname"] = *req.Hostname
	}
	if req.ApiUrl != nil {
		updates["api_url"] = *req.ApiUrl
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No fields to update",
		})
		return
	}

	updatedEnvironment, err := h.environmentService.UpdateEnvironment(c.Request.Context(), environmentID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update environment: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": updatedEnvironment,
		"message":     "Environment updated successfully",
	})
}

func (h *EnvironmentHandler) DeleteEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.DeleteEnvironment(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete environment: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Environment deleted successfully",
	})
}

func (h *EnvironmentHandler) TestConnection(c *gin.Context) {
	environmentID := c.Param("id")

	status, err := h.environmentService.TestConnection(c.Request.Context(), environmentID)

	response := dto.TestConnectionDto{
		Status: status,
	}

	if err != nil {
		response.Message = func() *string { s := err.Error(); return &s }()
	}

	httpStatus := http.StatusOK
	if status == "error" {
		httpStatus = http.StatusServiceUnavailable
	}

	c.JSON(httpStatus, response)
}

func (h *EnvironmentHandler) UpdateHeartbeat(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.UpdateEnvironmentHeartbeat(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update heartbeat",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Heartbeat updated successfully",
	})
}

func (h *EnvironmentHandler) GetContainers(c *gin.Context) {
	h.routeRequest(c, "/containers")
}

func (h *EnvironmentHandler) GetImages(c *gin.Context) {
	h.routeRequest(c, "/images")
}

func (h *EnvironmentHandler) GetNetworks(c *gin.Context) {
	h.routeRequest(c, "/networks")
}

func (h *EnvironmentHandler) GetVolumes(c *gin.Context) {
	h.routeRequest(c, "/volumes")
}

func (h *EnvironmentHandler) GetStacks(c *gin.Context) {
	h.routeRequest(c, "/stacks")
}

func (h *EnvironmentHandler) CreateContainer(c *gin.Context) {
	h.routeRequest(c, "/containers")
}

func (h *EnvironmentHandler) CreateNetwork(c *gin.Context) {
	h.routeRequest(c, "/networks")
}

func (h *EnvironmentHandler) CreateVolume(c *gin.Context) {
	h.routeRequest(c, "/volumes")
}

func (h *EnvironmentHandler) CreateStack(c *gin.Context) {
	h.routeRequest(c, "/stacks")
}

func (h *EnvironmentHandler) GetContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	c.Params = append(c.Params, gin.Param{Key: "containerId", Value: containerID})
	h.routeRequest(c, "/containers/"+containerID)
}

func (h *EnvironmentHandler) StartContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/start")
}

func (h *EnvironmentHandler) StopContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stop")
}

func (h *EnvironmentHandler) RestartContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/restart")
}

func (h *EnvironmentHandler) RemoveContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID)
}

func (h *EnvironmentHandler) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/logs")
}

func (h *EnvironmentHandler) GetStack(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName)
}

func (h *EnvironmentHandler) UpdateStack(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName)
}

func (h *EnvironmentHandler) DeleteStack(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName)
}

func (h *EnvironmentHandler) StartStack(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName+"/start")
}

func (h *EnvironmentHandler) StopStack(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName+"/stop")
}

func (h *EnvironmentHandler) RestartStack(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName+"/restart")
}

func (h *EnvironmentHandler) GetStackLogs(c *gin.Context) {
	stackName := c.Param("stackName")
	h.routeRequest(c, "/stacks/"+stackName+"/logs")
}
