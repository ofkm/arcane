package api

import (
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemHandler struct {
	dockerService *services.DockerClientService
	systemService *services.SystemService
}

func NewSystemHandler(dockerService *services.DockerClientService, systemService *services.SystemService) *SystemHandler {
	return &SystemHandler{
		dockerService: dockerService,
		systemService: systemService,
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

func (h *SystemHandler) GetStats(c *gin.Context) {
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

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"cpuUsage":     stats.CPUUsage,
		"memoryUsage":  stats.MemoryUsage,
		"memoryTotal":  stats.MemoryTotal,
		"diskUsage":    stats.DiskUsage,
		"diskTotal":    stats.DiskTotal,
		"cpuCount":     stats.CPUCount,
		"architecture": stats.Architecture,
		"platform":     stats.Platform,
		"hostname":     stats.Hostname,
	})
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

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"version":           version.Version,
		"apiVersion":        version.APIVersion,
		"gitCommit":         version.GitCommit,
		"goVersion":         version.GoVersion,
		"os":                version.Os,
		"arch":              version.Arch,
		"buildTime":         version.BuildTime,
		"containers":        len(containers),
		"containersRunning": info.ContainersRunning,
		"containersPaused":  info.ContainersPaused,
		"containersStopped": info.ContainersStopped,
		"images":            len(images),
		"storageDriver":     info.Driver,
		"loggingDriver":     info.LoggingDriver,
		"cgroupDriver":      info.CgroupDriver,
		"cgroupVersion":     info.CgroupVersion,
		"kernelVersion":     info.KernelVersion,
		"operatingSystem":   info.OperatingSystem,
		"osVersion":         info.OSVersion,
		"serverVersion":     info.ServerVersion,
		"architecture":      info.Architecture,
		"cpus":              info.NCPU,
		"memTotal":          info.MemTotal,
	})
}

func (h *SystemHandler) TestDockerConnection(c *gin.Context) {
	ctx := c.Request.Context()

	host := c.Query("host")

	var dockerClient *client.Client
	var err error

	if host != "" {
		dockerClient, err = client.NewClientWithOpts(
			client.WithHost(host),
			client.WithAPIVersionNegotiation(),
		)
	} else {
		dockerClient, err = h.dockerService.CreateConnection(ctx)
	}

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
	fmt.Println("=== PruneAll handler called ===")

	var req dto.PruneSystemDto
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("Error binding JSON: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	fmt.Printf("Parsed request: %+v\n", req)

	result, err := h.systemService.PruneAll(c.Request.Context(), req)
	if err != nil {
		fmt.Printf("SystemService.PruneAll returned error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to prune resources: " + err.Error(),
		})
		return
	}

	fmt.Printf("Prune completed successfully: %+v\n", result)
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
