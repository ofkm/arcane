package api

import (
	"log/slog"
	"net/http"
	"runtime"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

var sysWsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type SystemHandler struct {
	dockerService *services.DockerClientService
	systemService *services.SystemService
}

func NewSystemHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, systemService *services.SystemService, authMiddleware *middleware.AuthMiddleware) {
	handler := &SystemHandler{dockerService: dockerService, systemService: systemService}

	apiGroup := group.Group("/system")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/stats/ws", handler.GetStatsWS)
		apiGroup.GET("/docker/info", handler.GetDockerInfo)
		apiGroup.POST("/prune", handler.PruneAll)
		apiGroup.POST("/containers/start-all", handler.StartAllContainers)
		apiGroup.POST("/containers/start-stopped", handler.StartAllStoppedContainers)
		apiGroup.POST("/containers/stop-all", handler.StopAllContainers)
	}
}

type SystemStats struct {
	CPUUsage     float64 `json:"cpuUsage"`
	MemoryUsage  uint64  `json:"memoryUsage"`
	MemoryTotal  uint64  `json:"memoryTotal"`
	DiskUsage    uint64  `json:"diskUsage,omitempty"`
	DiskTotal    uint64  `json:"diskTotal,omitempty"`
	CPUCount     int     `json:"cpuCount"`
	Architecture string  `json:"architecture"`
	Platform     string  `json:"platform"`
	Hostname     string  `json:"hostname,omitempty"`
}

func (h *SystemHandler) GetDockerInfo(c *gin.Context) {
	ctx := c.Request.Context()

	dockerClient, err := h.dockerService.CreateConnection(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to connect to Docker: " + err.Error(),
		})
		return
	}
	defer dockerClient.Close()

	version, err := dockerClient.ServerVersion(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get Docker version: " + err.Error(),
		})
		return
	}

	info, err := dockerClient.Info(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get Docker info: " + err.Error(),
		})
		return
	}

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list containers: " + err.Error(),
		})
		return
	}

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list images: " + err.Error(),
		})
		return
	}

	dockerInfo := dto.DockerInfoDto{
		Success:           true,
		Version:           version.Version,
		APIVersion:        version.APIVersion,
		GitCommit:         version.GitCommit,
		GoVersion:         version.GoVersion,
		OS:                version.Os,
		Arch:              version.Arch,
		BuildTime:         version.BuildTime,
		Containers:        len(containers),
		ContainersRunning: info.ContainersRunning,
		ContainersPaused:  info.ContainersPaused,
		ContainersStopped: info.ContainersStopped,
		Images:            len(images),
		StorageDriver:     info.Driver,
		LoggingDriver:     info.LoggingDriver,
		CgroupDriver:      info.CgroupDriver,
		CgroupVersion:     info.CgroupVersion,
		KernelVersion:     info.KernelVersion,
		OperatingSystem:   info.OperatingSystem,
		OSVersion:         info.OSVersion,
		ServerVersion:     info.ServerVersion,
		Architecture:      info.Architecture,
		CPUs:              info.NCPU,
		MemTotal:          info.MemTotal,
	}

	c.JSON(http.StatusOK, dockerInfo)
}

func (h *SystemHandler) TestDockerConnection(c *gin.Context) {
	ctx := c.Request.Context()

	dockerClient, err := h.dockerService.CreateConnection(ctx)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Failed to create Docker client: " + err.Error(),
		})
		return
	}
	defer dockerClient.Close()

	_, err = dockerClient.Ping(ctx)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker is not accessible: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Docker connection successful",
	})
}

func (h *SystemHandler) PruneAll(c *gin.Context) {
	ctx := c.Request.Context()
	slog.InfoContext(ctx, "System prune operation initiated")

	var req dto.PruneSystemDto
	if err := c.ShouldBindJSON(&req); err != nil {
		slog.ErrorContext(ctx, "Failed to bind prune request JSON",
			slog.String("error", err.Error()),
			slog.String("client_ip", c.ClientIP()))
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	slog.InfoContext(ctx, "Prune request parsed successfully",
		slog.Bool("containers", req.Containers),
		slog.Bool("images", req.Images),
		slog.Bool("volumes", req.Volumes),
		slog.Bool("networks", req.Networks),
		slog.Bool("dangling", req.Dangling))

	result, err := h.systemService.PruneAll(ctx, req)
	if err != nil {
		slog.ErrorContext(ctx, "System prune operation failed",
			slog.String("error", err.Error()),
			slog.String("client_ip", c.ClientIP()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to prune resources: " + err.Error(),
		})
		return
	}

	slog.InfoContext(ctx, "System prune operation completed successfully",
		slog.Int("containers_pruned", len(result.ContainersPruned)),
		slog.Int("images_deleted", len(result.ImagesDeleted)),
		slog.Int("volumes_deleted", len(result.VolumesDeleted)),
		slog.Int("networks_deleted", len(result.NetworksDeleted)),
		slog.Uint64("space_reclaimed", result.SpaceReclaimed),
		slog.Bool("success", result.Success),
		slog.Int("error_count", len(result.Errors)))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Pruning completed",
		"data":    result,
	})
}

func (h *SystemHandler) StartAllContainers(c *gin.Context) {
	result, err := h.systemService.StartAllContainers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to start containers: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container start operation completed",
		"data":    result,
	})
}

func (h *SystemHandler) StartAllStoppedContainers(c *gin.Context) {
	result, err := h.systemService.StartAllStoppedContainers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to start stopped containers: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stopped containers start operation completed",
		"data":    result,
	})
}

func (h *SystemHandler) StopAllContainers(c *gin.Context) {
	result, err := h.systemService.StopAllContainers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to stop containers: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container stop operation completed",
		"data":    result,
	})
}

func (h *SystemHandler) GetStatsWS(c *gin.Context) {
	conn, err := sysWsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	sendStats := func() error {
		cpuPercent, err := cpu.Percent(time.Second, false)
		var cpuUsage float64
		if err != nil || len(cpuPercent) == 0 {
			cpuUsage = 0
		} else {
			cpuUsage = cpuPercent[0]
		}

		cpuCount, err := cpu.Counts(true)
		if err != nil {
			cpuCount = runtime.NumCPU()
		}

		memInfo, err := mem.VirtualMemory()
		var memoryUsage, memoryTotal uint64
		if err != nil {
			memoryUsage = 0
			memoryTotal = 0
		} else {
			memoryUsage = memInfo.Used
			memoryTotal = memInfo.Total
		}

		diskInfo, err := disk.Usage("/")
		var diskUsage, diskTotal uint64
		if err != nil {
			diskUsage = 0
			diskTotal = 0
		} else {
			diskUsage = diskInfo.Used
			diskTotal = diskInfo.Total
		}

		hostInfo, err := host.Info()
		var hostname string
		if err == nil {
			hostname = hostInfo.Hostname
		}

		stats := SystemStats{
			CPUUsage:     cpuUsage,
			MemoryUsage:  memoryUsage,
			MemoryTotal:  memoryTotal,
			DiskUsage:    diskUsage,
			DiskTotal:    diskTotal,
			CPUCount:     cpuCount,
			Architecture: runtime.GOARCH,
			Platform:     runtime.GOOS,
			Hostname:     hostname,
		}

		// write as JSON text message
		_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		return conn.WriteJSON(stats)
	}

	// initial send
	if err := sendStats(); err != nil {
		slog.Debug("failed to send initial system stats websocket", "err", err)
		return
	}

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ticker.C:
			if err := sendStats(); err != nil {
				slog.Debug("failed to send system stats websocket", "err", err)
				return
			}
		}
	}
}
