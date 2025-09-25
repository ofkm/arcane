package api

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
	ws "github.com/ofkm/arcane-backend/internal/utils/ws"
)

type ContainerHandler struct {
	containerService *services.ContainerService
	imageService     *services.ImageService
	dockerService    *services.DockerClientService
	logStreams       sync.Map // map[string]*logStream
}

func NewContainerHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, containerService *services.ContainerService, imageService *services.ImageService, authMiddleware *middleware.AuthMiddleware) {
	handler := &ContainerHandler{dockerService: dockerService, containerService: containerService, imageService: imageService}

	apiGroup := group.Group("/environments/:id/containers")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/counts", handler.GetContainerStatusCounts)
		apiGroup.GET("", handler.List)
		apiGroup.POST("", handler.Create)
		apiGroup.GET("/:containerId", handler.GetByID)
		apiGroup.GET("/:containerId/stats", handler.GetStats)
		apiGroup.GET("/:containerId/stats/stream", handler.GetStatsStream)
		apiGroup.POST("/:containerId/start", handler.Start)
		apiGroup.POST("/:containerId/stop", handler.Stop)
		apiGroup.POST("/:containerId/restart", handler.Restart)
		apiGroup.GET("/:containerId/logs/ws", handler.GetLogsWS)
		apiGroup.DELETE("/:containerId", handler.Delete)

	}
}

type containerLogStream struct {
	hub    *ws.Hub
	once   sync.Once
	cancel context.CancelFunc
	format string
	seq    atomic.Uint64
}

func (h *ContainerHandler) getOrStartContainerLogHub(containerID, format string, batched bool, follow bool, tail, since string, timestamps bool) *ws.Hub {
	key := fmt.Sprintf("%s::%s::batched=%t", containerID, format, batched)
	v, _ := h.logStreams.LoadOrStore(key, &containerLogStream{
		hub:    ws.NewHub(1024),
		format: format,
	})
	ls := v.(*containerLogStream)

	ls.once.Do(func() {
		ctx, cancel := context.WithCancel(context.Background())
		ls.cancel = cancel
		go ls.hub.Run(ctx)

		// Always pull raw lines first
		lines := make(chan string, 256)
		go func() {
			defer close(lines)
			_ = h.containerService.StreamLogs(ctx, containerID, lines, follow, tail, since, timestamps)
		}()

		if format == "json" {
			msgs := make(chan ws.LogMessage, 256)
			go func() {
				defer close(msgs)
				for line := range lines {
					level, msg, ts := ws.NormalizeContainerLine(line)
					seq := ls.seq.Add(1)
					timestamp := ts
					if timestamp == "" {
						timestamp = ws.NowRFC3339()
					}
					msgs <- ws.LogMessage{
						Seq:       seq,
						Level:     level,
						Message:   msg,
						Timestamp: timestamp,
					}
				}
			}()
			if batched {
				go ws.ForwardLogJSONBatched(ctx, ls.hub, msgs, 50, 400*time.Millisecond)
			} else {
				go ws.ForwardLogJSON(ctx, ls.hub, msgs)
			}
		} else {
			// Plain text mode still strips ANSI & timestamps for consistency
			cleanChan := make(chan string, 256)
			go func() {
				defer close(cleanChan)
				for line := range lines {
					_, msg, _ := ws.NormalizeContainerLine(line)
					cleanChan <- msg
				}
			}()
			go ws.ForwardLines(ctx, ls.hub, cleanChan)
		}
	})

	return ls.hub
}

// GET /api/containers/:id/logs/ws
// /api/environments/:envId/containers/:containerId/logs/ws
func (h *ContainerHandler) GetLogsWS(c *gin.Context) {
	containerID := c.Param("containerId")
	if containerID == "" {
		containerID = c.Param("id")
	}
	if strings.TrimSpace(containerID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Container ID is required"}})
		return
	}

	follow := c.DefaultQuery("follow", "true") == "true"
	tail := c.DefaultQuery("tail", "100")
	since := c.Query("since")
	timestamps := c.DefaultQuery("timestamps", "false") == "true"
	format := c.DefaultQuery("format", "text")
	batched := c.DefaultQuery("batched", "false") == "true"

	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	hub := h.getOrStartContainerLogHub(containerID, format, batched, follow, tail, since, timestamps)
	ws.ServeClient(context.Background(), hub, conn)
}

func (h *ContainerHandler) PullImage(c *gin.Context) {
	id := c.Param("containerId")

	container, err := h.containerService.GetContainerByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"data":    gin.H{"error": "Container not found: " + err.Error()},
		})
		return
	}

	imageName := container.Image
	if imageName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Container has no image to pull"},
		})
		return
	}

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	if err := h.imageService.PullImage(c.Request.Context(), imageName, c.Writer, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to pull image: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Image pulled successfully", "image": imageName},
	})
}

func (h *ContainerHandler) List(c *gin.Context) {
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

	includeAll := true

	containers, pagination, err := h.containerService.ListContainersPaginated(c.Request.Context(), req, includeAll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to list containers: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       containers,
		"pagination": pagination,
	})
}

func (h *ContainerHandler) GetByID(c *gin.Context) {
	id := c.Param("containerId")

	container, err := h.containerService.GetContainerByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	details := dto.NewContainerDetailsDto(container)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    details,
	})
}

func (h *ContainerHandler) Start(c *gin.Context) {
	id := c.Param("containerId")

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	if err := h.containerService.StartContainer(c.Request.Context(), id, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Container started successfully"},
	})
}

func (h *ContainerHandler) Stop(c *gin.Context) {
	id := c.Param("containerId")

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	if err := h.containerService.StopContainer(c.Request.Context(), id, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Container stopped successfully"},
	})
}

func (h *ContainerHandler) Restart(c *gin.Context) {
	id := c.Param("containerId")

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	if err := h.containerService.RestartContainer(c.Request.Context(), id, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Container restarted successfully"},
	})
}

func (h *ContainerHandler) Delete(c *gin.Context) {
	id := c.Param("containerId")
	force := c.Query("force") == "true"
	removeVolumes := c.Query("volumes") == "true"

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	if err := h.containerService.DeleteContainer(c.Request.Context(), id, force, removeVolumes, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Container deleted successfully"},
	})
}

func (h *ContainerHandler) GetContainerStatusCounts(c *gin.Context) {
	_, running, stopped, total, err := h.dockerService.GetAllContainers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get container counts: " + err.Error()},
		})
		return
	}

	out := dto.ContainerStatusLengthsDto{
		RunningContainers: running,
		StoppedContainers: stopped,
		TotalContainers:   total,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

func (h *ContainerHandler) Create(c *gin.Context) {
	var req dto.CreateContainerDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid request format: " + err.Error()},
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
				"data":    gin.H{"error": "Invalid port format: " + err.Error()},
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

	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}
	containerJSON, err := h.containerService.CreateContainer(
		c.Request.Context(),
		config,
		hostConfig,
		networkingConfig,
		req.Name,
		*currentUser,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
		})
		return
	}

	out := dto.ContainerCreatedDto{
		ID:      containerJSON.ID,
		Name:    containerJSON.Name,
		Image:   containerJSON.Config.Image,
		Status:  containerJSON.State.Status,
		Created: containerJSON.Created,
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    out,
	})
}

// GetStats returns container resource usage statistics
func (h *ContainerHandler) GetStats(c *gin.Context) {
	containerID := c.Param("containerId")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Container ID is required"},
		})
		return
	}

	// Check if streaming is requested
	stream := c.Query("stream") == "true"

	stats, err := h.containerService.GetStats(c.Request.Context(), containerID, stream)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": err.Error()},
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
			"data":    gin.H{"error": "Container ID is required"},
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

		if err := h.containerService.StreamStats(c.Request.Context(), containerID, statsChan); err != nil {
			errChan <- err
		}
	}()

	c.Stream(func(w io.Writer) bool {
		select {
		case stats, ok := <-statsChan:
			if !ok {
				return false
			}
			c.SSEvent("stats", stats)
			return true
		case err, ok := <-errChan:
			if !ok || err == nil {
				// graceful shutdown or no error; stop streaming
				return false
			}
			c.SSEvent("error", gin.H{"error": err.Error()})
			return false
		case <-c.Request.Context().Done():
			return false
		}
	})
}
