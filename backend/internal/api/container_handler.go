package api

import (
	"io"
	"net/http"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ContainerHandler struct {
	containerService *services.ContainerService
	imageService     *services.ImageService
}

func NewContainerHandler(containerService *services.ContainerService, imageService *services.ImageService) *ContainerHandler {
	return &ContainerHandler{
		containerService: containerService,
		imageService:     imageService,
	}
}

func (h *ContainerHandler) PullImage(c *gin.Context) {
	id := c.Param("containerId")

	container, err := h.containerService.GetContainerByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Container not found: " + err.Error(),
		})
		return
	}

	imageName := container.Image
	if imageName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Container has no image to pull",
		})
		return
	}

	err = h.imageService.PullImage(c.Request.Context(), imageName, c.Writer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to pull image: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image pulled successfully",
		"image":   imageName,
	})
}

func (h *ContainerHandler) List(c *gin.Context) {
	includeAll := c.Query("all") == "true"

	containers, err := h.containerService.ListContainers(c.Request.Context(), includeAll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    containers,
	})
}

func (h *ContainerHandler) GetByID(c *gin.Context) {
	id := c.Param("containerId")

	container, err := h.containerService.GetContainerByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    container,
	})
}

func (h *ContainerHandler) Start(c *gin.Context) {
	id := c.Param("containerId")

	if err := h.containerService.StartContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container started successfully",
	})
}

func (h *ContainerHandler) Stop(c *gin.Context) {
	id := c.Param("containerId")

	if err := h.containerService.StopContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container stopped successfully",
	})
}

func (h *ContainerHandler) Restart(c *gin.Context) {
	id := c.Param("containerId")

	if err := h.containerService.RestartContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container restarted successfully",
	})
}

func (h *ContainerHandler) GetLogs(c *gin.Context) {
	id := c.Param("id")
	tail := c.DefaultQuery("tail", "100")

	logs, err := h.containerService.GetContainerLogs(c.Request.Context(), id, tail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"logs": logs},
	})
}

func (h *ContainerHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	force := c.Query("force") == "true"
	removeVolumes := c.Query("volumes") == "true"

	if err := h.containerService.DeleteContainer(c.Request.Context(), id, force, removeVolumes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container deleted successfully",
	})
}

func (h *ContainerHandler) IsImageInUse(c *gin.Context) {
	imageID := c.Param("imageId")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Image ID is required",
		})
		return
	}

	containers, err := h.containerService.ListContainers(c.Request.Context(), true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list containers: " + err.Error(),
		})
		return
	}

	inUse := false
	for _, container := range containers {
		if container.ImageID == imageID || container.Image == imageID {
			inUse = true
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"inUse":   inUse,
	})
}

func (h *ContainerHandler) Create(c *gin.Context) {
	var req dto.CreateContainerDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	config := &container.Config{
		Image:        req.Image,
		Cmd:          req.Command,
		Entrypoint:   req.Entrypoint,
		WorkingDir:   req.WorkingDir,
		User:         req.User,
		Env:          req.Environment,
		ExposedPorts: make(nat.PortSet),
		Labels: map[string]string{
			"com.arcane.created": "true",
		},
	}

	portBindings := make(nat.PortMap)
	for containerPort, hostPort := range req.Ports {
		port, err := nat.NewPort("tcp", containerPort)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid port format: " + err.Error(),
			})
			return
		}
		config.ExposedPorts[port] = struct{}{}
		portBindings[port] = []nat.PortBinding{
			{
				HostPort: hostPort,
			},
		}
	}

	hostConfig := &container.HostConfig{
		Binds:        req.Volumes,
		PortBindings: portBindings,
		Privileged:   req.Privileged,
		AutoRemove:   req.AutoRemove,
		RestartPolicy: container.RestartPolicy{
			Name: container.RestartPolicyMode(req.RestartPolicy),
		},
	}

	if req.Memory > 0 {
		hostConfig.Memory = req.Memory
	}
	if req.CPUs > 0 {
		hostConfig.NanoCPUs = int64(req.CPUs * 1000000000)
	}

	var networkingConfig *network.NetworkingConfig
	if len(req.Networks) > 0 {
		networkingConfig = &network.NetworkingConfig{
			EndpointsConfig: make(map[string]*network.EndpointSettings),
		}
		for _, networkName := range req.Networks {
			networkingConfig.EndpointsConfig[networkName] = &network.EndpointSettings{}
		}
	}

	containerJSON, err := h.containerService.CreateContainer(
		c.Request.Context(),
		config,
		hostConfig,
		networkingConfig,
		req.Name,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":      containerJSON.ID,
			"name":    containerJSON.Name,
			"image":   containerJSON.Config.Image,
			"status":  containerJSON.State.Status,
			"created": containerJSON.Created,
		},
	})
}

// GetStats returns container resource usage statistics
func (h *ContainerHandler) GetStats(c *gin.Context) {
	containerID := c.Param("containerId")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Container ID is required",
		})
		return
	}

	// Check if streaming is requested
	stream := c.Query("stream") == "true"

	stats, err := h.containerService.GetStats(c.Request.Context(), containerID, stream)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

func (h *ContainerHandler) GetStatsStream(c *gin.Context) {
	containerID := c.Param("containerId")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Container ID is required",
		})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	statsChan := make(chan interface{}, 10)
	errChan := make(chan error, 1)

	go func() {
		defer close(statsChan)
		defer close(errChan)

		err := h.containerService.StreamStats(c.Request.Context(), containerID, statsChan)
		if err != nil {
			errChan <- err
		}
	}()

	// Send stats to client
	c.Stream(func(w io.Writer) bool {
		select {
		case stats, ok := <-statsChan:
			if !ok {
				return false
			}
			c.SSEvent("stats", stats)
			return true
		case err := <-errChan:
			c.SSEvent("error", gin.H{"error": err.Error()})
			return false
		case <-c.Request.Context().Done():
			return false
		}
	})
}

func (h *ContainerHandler) GetLogsStream(c *gin.Context) {
	containerID := c.Param("containerId")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Container ID is required",
		})
		return
	}

	// Get query parameters for log options
	follow := c.DefaultQuery("follow", "true") == "true"
	tail := c.DefaultQuery("tail", "100")
	since := c.Query("since")
	timestamps := c.DefaultQuery("timestamps", "false") == "true"

	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	logsChan := make(chan string, 10)
	errChan := make(chan error, 1)

	// Start streaming logs in a goroutine
	go func() {
		defer close(logsChan)
		defer close(errChan)

		err := h.containerService.StreamLogs(c.Request.Context(), containerID, logsChan, follow, tail, since, timestamps)
		if err != nil {
			errChan <- err
		}
	}()

	// Send logs to client
	c.Stream(func(w io.Writer) bool {
		select {
		case logLine, ok := <-logsChan:
			if !ok {
				return false
			}
			c.SSEvent("log", gin.H{"data": logLine, "timestamp": time.Now()})
			return true
		case err := <-errChan:
			c.SSEvent("error", gin.H{"error": err.Error()})
			return false
		case <-c.Request.Context().Done():
			return false
		}
	})
}
