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
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemHandler struct {
	dockerService *services.DockerClientService
	systemService *services.SystemService
	sysWsUpgrader websocket.Upgrader
}

func NewSystemHandler(group *gin.RouterGroup, dockerService *services.DockerClientService, systemService *services.SystemService, authMiddleware *middleware.AuthMiddleware, cfg *config.Config) {
	handler := &SystemHandler{
		dockerService: dockerService,
		systemService: systemService,
		sysWsUpgrader: websocket.Upgrader{
			CheckOrigin: httputil.ValidateWebSocketOrigin(cfg.AppUrl),
		},
	}

	apiGroup := group.Group("/environments/:id/system")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/stats/ws", handler.Stats)
		apiGroup.GET("/docker/info", handler.GetDockerInfo)
		apiGroup.POST("/prune", handler.PruneAll)
		apiGroup.POST("/containers/start-all", handler.StartAllContainers)
		apiGroup.POST("/containers/start-stopped", handler.StartAllStoppedContainers)
		apiGroup.POST("/containers/stop-all", handler.StopAllContainers)
		apiGroup.POST("/convert", handler.ConvertDockerRun)

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
		httputil.RespondWithError(c, err)
		return
	}
	defer dockerClient.Close()

	version, err := dockerClient.ServerVersion(ctx)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	info, err := dockerClient.Info(ctx)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		httputil.RespondWithError(c, err)
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

	httputil.RespondWithSuccess(c, http.StatusOK, dockerInfo)
}

func (h *SystemHandler) PruneAll(c *gin.Context) {
	ctx := c.Request.Context()
	slog.InfoContext(ctx, "System prune operation initiated")

	var req dto.PruneSystemDto
	if err := c.ShouldBindJSON(&req); err != nil {
		slog.ErrorContext(ctx, "Failed to bind prune request JSON",
			slog.String("error", err.Error()),
			slog.String("client_ip", c.ClientIP()))
		httputil.RespondBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	slog.InfoContext(ctx, "Prune request parsed successfully",
		slog.Bool("containers", req.Containers),
		slog.Bool("images", req.Images),
		slog.Bool("volumes", req.Volumes),
		slog.Bool("networks", req.Networks),
		slog.Bool("build_cache", req.BuildCache),
		slog.Bool("dangling", req.Dangling))

	result, err := h.systemService.PruneAll(ctx, req)
	if err != nil {
		slog.ErrorContext(ctx, "System prune operation failed",
			slog.String("error", err.Error()),
			slog.String("client_ip", c.ClientIP()))
		httputil.RespondWithError(c, err)
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

	httputil.RespondWithSuccess(c, http.StatusOK, result)
}

func (h *SystemHandler) StartAllContainers(c *gin.Context) {
	result, err := h.systemService.StartAllContainers(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, result)
}

func (h *SystemHandler) StartAllStoppedContainers(c *gin.Context) {
	result, err := h.systemService.StartAllStoppedContainers(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, result)
}

func (h *SystemHandler) StopAllContainers(c *gin.Context) {
	result, err := h.systemService.StopAllContainers(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, result)
}

//nolint:gocognit
func (h *SystemHandler) Stats(c *gin.Context) {
	conn, err := h.sysWsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var lastCPU float64

	send := func(block bool) error {
		var cpuUsage float64
		if block {
			if vals, err := cpu.Percent(time.Second, false); err == nil && len(vals) > 0 {
				cpuUsage = vals[0]
				lastCPU = cpuUsage
			} else {
				cpuUsage = lastCPU
			}
		} else {
			cpuUsage = lastCPU
		}

		cpuCount, err := cpu.Counts(true)
		if err != nil {
			cpuCount = runtime.NumCPU()
		}

		memInfo, _ := mem.VirtualMemory()
		var memUsed, memTotal uint64
		if memInfo != nil {
			memUsed = memInfo.Used
			memTotal = memInfo.Total
		}

		diskInfo, _ := disk.Usage("/")
		var diskUsed, diskTotal uint64
		if diskInfo != nil {
			diskUsed = diskInfo.Used
			diskTotal = diskInfo.Total
		}

		hostInfo, _ := host.Info()
		var hostname string
		if hostInfo != nil {
			hostname = hostInfo.Hostname
		}

		stats := SystemStats{
			CPUUsage:     cpuUsage,
			MemoryUsage:  memUsed,
			MemoryTotal:  memTotal,
			DiskUsage:    diskUsed,
			DiskTotal:    diskTotal,
			CPUCount:     cpuCount,
			Architecture: runtime.GOARCH,
			Platform:     runtime.GOOS,
			Hostname:     hostname,
		}

		_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		return conn.WriteJSON(stats)
	}

	if err := send(true); err != nil {
		return
	}

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ticker.C:
			if err := send(true); err != nil {
				return
			}
		}
	}
}

func (h *SystemHandler) ConvertDockerRun(c *gin.Context) {
	var req models.ConvertDockerRunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format: "+err.Error())
		return
	}

	parsed, err := h.systemService.ParseDockerRunCommand(req.DockerRunCommand)
	if err != nil {
		httputil.RespondBadRequest(c, "Failed to parse docker run command. Please check the syntax.")
		return
	}

	dockerCompose, envVars, serviceName, err := h.systemService.ConvertToDockerCompose(parsed)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	response := models.ConvertDockerRunResponse{
		Success:       true,
		DockerCompose: dockerCompose,
		EnvVars:       envVars,
		ServiceName:   serviceName,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}
