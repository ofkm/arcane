package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log/slog"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

// GPUStats represents statistics for a single GPU
type GPUStats struct {
	Name        string  `json:"name"`
	Index       int     `json:"index"`
	MemoryUsed  float64 `json:"memoryUsed"`  // in MB
	MemoryTotal float64 `json:"memoryTotal"` // in MB
}

// GPUService handles GPU monitoring and statistics collection
type GPUService struct {
	detectionCache struct {
		sync.RWMutex
		detected  bool
		timestamp time.Time
		gpuType   string // "nvidia", "amd", "intel", "jetson", or ""
		toolPath  string
	}
	nvidiaSmi      bool
	rocmSmi        bool
	intelGpuTop    bool
	tegrastats     bool
	detectionDone  bool
	detectionMutex sync.Mutex
}

// NewGPUService creates a new GPU service instance
func NewGPUService() *GPUService {
	return &GPUService{}
}

const (
	mebibytesInAMegabyte = 1.048576
	cacheDuration        = 30 * time.Second
)

// GetGPUStats collects and returns GPU statistics for all available GPUs
func (g *GPUService) GetGPUStats(ctx context.Context) ([]GPUStats, error) {
	// Check if we need to detect GPUs
	if !g.detectionDone {
		if err := g.detectGPUs(ctx); err != nil {
			return nil, err
		}
	}

	// Check cache
	g.detectionCache.RLock()
	if g.detectionCache.detected && time.Since(g.detectionCache.timestamp) < cacheDuration {
		gpuType := g.detectionCache.gpuType
		g.detectionCache.RUnlock()

		// Collect stats based on GPU type
		switch gpuType {
		case "nvidia":
			return g.getNvidiaStats(ctx)
		case "amd":
			return g.getAMDStats(ctx)
		case "intel":
			return g.getIntelStats(ctx)
		case "jetson":
			return g.getJetsonStats(ctx)
		}
	}
	g.detectionCache.RUnlock()

	// Re-detect if cache expired
	if err := g.detectGPUs(ctx); err != nil {
		return nil, err
	}

	// Try again after detection
	g.detectionCache.RLock()
	gpuType := g.detectionCache.gpuType
	g.detectionCache.RUnlock()

	switch gpuType {
	case "nvidia":
		return g.getNvidiaStats(ctx)
	case "amd":
		return g.getAMDStats(ctx)
	case "intel":
		return g.getIntelStats(ctx)
	case "jetson":
		return g.getJetsonStats(ctx)
	default:
		return nil, fmt.Errorf("no supported GPU found")
	}
}

// detectGPUs detects available GPU management tools
func (g *GPUService) detectGPUs(ctx context.Context) error {
	g.detectionMutex.Lock()
	defer g.detectionMutex.Unlock()

	slog.DebugContext(ctx, "Starting GPU detection")

	// Check for NVIDIA
	if path, err := exec.LookPath("nvidia-smi"); err == nil {
		g.nvidiaSmi = true
		g.detectionCache.Lock()
		g.detectionCache.detected = true
		g.detectionCache.gpuType = "nvidia"
		g.detectionCache.toolPath = path
		g.detectionCache.timestamp = time.Now()
		g.detectionCache.Unlock()
		g.detectionDone = true
		slog.InfoContext(ctx, "NVIDIA GPU detected", slog.String("tool", "nvidia-smi"), slog.String("path", path))
		return nil
	}

	// Check for AMD ROCm
	if path, err := exec.LookPath("rocm-smi"); err == nil {
		g.rocmSmi = true
		g.detectionCache.Lock()
		g.detectionCache.detected = true
		g.detectionCache.gpuType = "amd"
		g.detectionCache.toolPath = path
		g.detectionCache.timestamp = time.Now()
		g.detectionCache.Unlock()
		g.detectionDone = true
		slog.InfoContext(ctx, "AMD GPU detected", slog.String("tool", "rocm-smi"), slog.String("path", path))
		return nil
	}

	// Check for NVIDIA Jetson
	if path, err := exec.LookPath("tegrastats"); err == nil {
		g.tegrastats = true
		g.detectionCache.Lock()
		g.detectionCache.detected = true
		g.detectionCache.gpuType = "jetson"
		g.detectionCache.toolPath = path
		g.detectionCache.timestamp = time.Now()
		g.detectionCache.Unlock()
		g.detectionDone = true
		slog.InfoContext(ctx, "NVIDIA Jetson detected", slog.String("tool", "tegrastats"), slog.String("path", path))
		return nil
	}

	// Check for Intel GPU
	if path, err := exec.LookPath("intel_gpu_top"); err == nil {
		g.intelGpuTop = true
		g.detectionCache.Lock()
		g.detectionCache.detected = true
		g.detectionCache.gpuType = "intel"
		g.detectionCache.toolPath = path
		g.detectionCache.timestamp = time.Now()
		g.detectionCache.Unlock()
		g.detectionDone = true
		slog.InfoContext(ctx, "Intel GPU detected", slog.String("tool", "intel_gpu_top"), slog.String("path", path))
		return nil
	}

	g.detectionDone = true
	slog.DebugContext(ctx, "No GPU detected on this system")
	return fmt.Errorf("no supported GPU found")
}

// getNvidiaStats collects NVIDIA GPU statistics using nvidia-smi
func (g *GPUService) getNvidiaStats(ctx context.Context) ([]GPUStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Query: index, name, memory.used, memory.total
	cmd := exec.CommandContext(ctx, "nvidia-smi",
		"--query-gpu=index,name,memory.used,memory.total",
		"--format=csv,noheader,nounits")

	output, err := cmd.Output()
	if err != nil {
		slog.WarnContext(ctx, "Failed to execute nvidia-smi", slog.String("error", err.Error()))
		return nil, fmt.Errorf("nvidia-smi execution failed: %w", err)
	}

	return g.parseNvidiaOutput(ctx, output)
}

// parseNvidiaOutput parses CSV output from nvidia-smi
func (g *GPUService) parseNvidiaOutput(ctx context.Context, output []byte) ([]GPUStats, error) {
	reader := csv.NewReader(bytes.NewReader(output))
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		slog.WarnContext(ctx, "Failed to parse nvidia-smi CSV output", slog.String("error", err.Error()))
		return nil, fmt.Errorf("failed to parse nvidia-smi output: %w", err)
	}

	var stats []GPUStats
	for _, record := range records {
		if len(record) < 4 {
			continue
		}

		index, err := strconv.Atoi(strings.TrimSpace(record[0]))
		if err != nil {
			slog.WarnContext(ctx, "Failed to parse GPU index", slog.String("value", record[0]))
			continue
		}

		name := strings.TrimSpace(record[1])

		memUsed, err := strconv.ParseFloat(strings.TrimSpace(record[2]), 64)
		if err != nil {
			slog.WarnContext(ctx, "Failed to parse memory used", slog.String("value", record[2]))
			continue
		}

		memTotal, err := strconv.ParseFloat(strings.TrimSpace(record[3]), 64)
		if err != nil {
			slog.WarnContext(ctx, "Failed to parse memory total", slog.String("value", record[3]))
			continue
		}

		// nvidia-smi returns MiB, convert to MB
		stats = append(stats, GPUStats{
			Name:        name,
			Index:       index,
			MemoryUsed:  memUsed / mebibytesInAMegabyte,
			MemoryTotal: memTotal / mebibytesInAMegabyte,
		})
	}

	if len(stats) == 0 {
		return nil, fmt.Errorf("no GPU data parsed from nvidia-smi")
	}

	slog.DebugContext(ctx, "Collected NVIDIA GPU stats", slog.Int("gpu_count", len(stats)))
	return stats, nil
}

// getAMDStats collects AMD GPU statistics using rocm-smi
func (g *GPUService) getAMDStats(ctx context.Context) ([]GPUStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "rocm-smi", "--showmeminfo", "vram", "--json")
	output, err := cmd.Output()
	if err != nil {
		slog.WarnContext(ctx, "Failed to execute rocm-smi", slog.String("error", err.Error()))
		return nil, fmt.Errorf("rocm-smi execution failed: %w", err)
	}

	return g.parseROCmOutput(ctx, output)
}

// ROCmSMIOutput represents the JSON structure from rocm-smi
type ROCmSMIOutput map[string]ROCmGPUInfo

type ROCmGPUInfo struct {
	VRAMUsed  string `json:"VRAM Total Used Memory (B)"`
	VRAMTotal string `json:"VRAM Total Memory (B)"`
}

// parseROCmOutput parses JSON output from rocm-smi
func (g *GPUService) parseROCmOutput(ctx context.Context, output []byte) ([]GPUStats, error) {
	var rocmData ROCmSMIOutput
	if err := json.Unmarshal(output, &rocmData); err != nil {
		slog.WarnContext(ctx, "Failed to parse rocm-smi JSON output", slog.String("error", err.Error()))
		return nil, fmt.Errorf("failed to parse rocm-smi output: %w", err)
	}

	var stats []GPUStats
	index := 0
	for gpuID, info := range rocmData {
		// Parse memory used (in bytes)
		memUsedBytes, err := strconv.ParseFloat(info.VRAMUsed, 64)
		if err != nil {
			slog.WarnContext(ctx, "Failed to parse AMD memory used", slog.String("gpu", gpuID), slog.String("value", info.VRAMUsed))
			continue
		}

		// Parse memory total (in bytes)
		memTotalBytes, err := strconv.ParseFloat(info.VRAMTotal, 64)
		if err != nil {
			slog.WarnContext(ctx, "Failed to parse AMD memory total", slog.String("gpu", gpuID), slog.String("value", info.VRAMTotal))
			continue
		}

		// Convert bytes to MB
		memUsedMB := memUsedBytes / (1024 * 1024)
		memTotalMB := memTotalBytes / (1024 * 1024)

		stats = append(stats, GPUStats{
			Name:        fmt.Sprintf("AMD GPU %s", gpuID),
			Index:       index,
			MemoryUsed:  memUsedMB,
			MemoryTotal: memTotalMB,
		})
		index++
	}

	if len(stats) == 0 {
		return nil, fmt.Errorf("no GPU data parsed from rocm-smi")
	}

	slog.DebugContext(ctx, "Collected AMD GPU stats", slog.Int("gpu_count", len(stats)))
	return stats, nil
}

// getIntelStats collects Intel GPU statistics using intel_gpu_top
func (g *GPUService) getIntelStats(ctx context.Context) ([]GPUStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// intel_gpu_top requires running with -o - for single sample JSON output
	cmd := exec.CommandContext(ctx, "intel_gpu_top", "-J", "-o", "-")
	output, err := cmd.Output()
	if err != nil {
		slog.WarnContext(ctx, "Failed to execute intel_gpu_top", slog.String("error", err.Error()))
		return nil, fmt.Errorf("intel_gpu_top execution failed: %w", err)
	}

	return g.parseIntelOutput(ctx, output)
}

// IntelGPUTopOutput represents simplified intel_gpu_top JSON structure
type IntelGPUTopOutput struct {
	Clients []struct {
		Name   string `json:"name"`
		Memory struct {
			Resident int64 `json:"resident"`
			Shared   int64 `json:"shared"`
		} `json:"memory"`
	} `json:"clients"`
}

// parseIntelOutput parses JSON output from intel_gpu_top
func (g *GPUService) parseIntelOutput(ctx context.Context, output []byte) ([]GPUStats, error) {
	// intel_gpu_top doesn't provide straightforward total memory info
	// This is a simplified implementation - for MVP we'll return basic info

	// For now, return a placeholder indicating Intel GPU detected
	// A more complete implementation would parse /sys/class/drm/card*/device/mem_info_vram_total
	stats := []GPUStats{
		{
			Name:        "Intel GPU",
			Index:       0,
			MemoryUsed:  0,
			MemoryTotal: 0,
		},
	}

	slog.DebugContext(ctx, "Intel GPU detected but detailed stats not yet implemented")
	return stats, nil
}

// getJetsonStats collects NVIDIA Jetson statistics using tegrastats
func (g *GPUService) getJetsonStats(ctx context.Context) ([]GPUStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// tegrastats outputs continuous stream, we'll use --interval for single sample
	cmd := exec.CommandContext(ctx, "tegrastats", "--interval", "1000")
	output, err := cmd.Output()
	if err != nil {
		slog.WarnContext(ctx, "Failed to execute tegrastats", slog.String("error", err.Error()))
		return nil, fmt.Errorf("tegrastats execution failed: %w", err)
	}

	return g.parseJetsonOutput(ctx, output)
}

// parseJetsonOutput parses text output from tegrastats
func (g *GPUService) parseJetsonOutput(ctx context.Context, output []byte) ([]GPUStats, error) {
	// tegrastats output format: RAM 1234/5678MB (lfb 1x2MB) ...
	// This is a simplified parser for MVP

	lines := strings.Split(string(output), "\n")
	if len(lines) == 0 {
		return nil, fmt.Errorf("no output from tegrastats")
	}

	// Parse first line for RAM info (Jetson uses unified memory)
	// Example: "RAM 1234/5678MB"
	for _, line := range lines {
		if strings.Contains(line, "RAM") {
			// Simple parsing - extract RAM usage
			parts := strings.Fields(line)
			for i, part := range parts {
				if part == "RAM" && i+1 < len(parts) {
					memPart := parts[i+1]
					if strings.Contains(memPart, "/") && strings.HasSuffix(memPart, "MB") {
						memPart = strings.TrimSuffix(memPart, "MB")
						memValues := strings.Split(memPart, "/")
						if len(memValues) == 2 {
							used, _ := strconv.ParseFloat(memValues[0], 64)
							total, _ := strconv.ParseFloat(memValues[1], 64)

							return []GPUStats{
								{
									Name:        "NVIDIA Jetson",
									Index:       0,
									MemoryUsed:  used,
									MemoryTotal: total,
								},
							}, nil
						}
					}
				}
			}
		}
	}

	slog.DebugContext(ctx, "NVIDIA Jetson detected but could not parse memory stats")
	return nil, fmt.Errorf("failed to parse tegrastats output")
}

// IsGPUAvailable checks if any GPU is available without collecting stats
func (g *GPUService) IsGPUAvailable(ctx context.Context) bool {
	if !g.detectionDone {
		_ = g.detectGPUs(ctx)
	}

	g.detectionCache.RLock()
	defer g.detectionCache.RUnlock()
	return g.detectionCache.detected
}
