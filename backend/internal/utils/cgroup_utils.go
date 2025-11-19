package utils

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/v4/host"
)

const unrestricted = 9223372036854771712

type CgroupLimits struct {
	MemoryLimit int64
	MemoryUsage int64
	CPUQuota    int64
	CPUPeriod   int64
	CPUCount    int
}

func DetectCgroupLimits() (*CgroupLimits, error) {
	limits := &CgroupLimits{
		MemoryLimit: -1,
		MemoryUsage: -1,
		CPUQuota:    -1,
		CPUPeriod:   -1,
		CPUCount:    -1,
	}

	// Check if we are in a cgroup environment
	// We check this first to avoid returning host stats as cgroup stats
	if !isInCgroup() {
		return nil, fmt.Errorf("not running in a cgroup")
	}

	if isCgroupV2() {
		return detectCgroupV2Limits(limits)
	}

	return detectCgroupV1Limits(limits)
}

func isInCgroup() bool {
	// Check for standard virtualization indicators
	if info, err := host.Info(); err == nil {
		if info.VirtualizationSystem != "" && strings.EqualFold(info.VirtualizationRole, "guest") {
			return true
		}
	}

	// Check for Docker specific file
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}

	// Check if we have explicit limits set (which implies we are restricted)
	return hasExplicitCgroupLimit()
}

func isCgroupV2() bool {
	_, err := os.Stat("/sys/fs/cgroup/cgroup.controllers")
	return err == nil
}

func hasExplicitCgroupLimit() bool {
	if isCgroupV2() {
		if limit, err := readCgroupV2Int64("/sys/fs/cgroup/memory.max"); err == nil && isFiniteLimit(limit) {
			return true
		}

		if quota, period := readCgroupV2CPU(); quota > 0 && period > 0 {
			return true
		}

		return false
	}

	// For V1, we use the same logic as detectCgroupV1Limits to check for limits
	cgroupPath, _ := getCgroupV1Path() // Ignore error, might be empty

	// Check memory limit
	if limit, err := readCgroupV1WithFallback("memory", cgroupPath, "memory.limit_in_bytes"); err == nil && isFiniteLimit(limit) {
		return true
	}

	// Check CPU quota
	if quota, err := readCgroupV1CPUControllerInt64(cgroupPath, "cpu.cfs_quota_us"); err == nil && quota > 0 {
		if period, err := readCgroupV1CPUControllerInt64(cgroupPath, "cpu.cfs_period_us"); err == nil && period > 0 {
			return true
		}
	}

	return false
}

func detectCgroupV2Limits(limits *CgroupLimits) (*CgroupLimits, error) {
	if memLimit, err := readCgroupV2Int64("/sys/fs/cgroup/memory.max"); err == nil {
		if memLimit != unrestricted {
			limits.MemoryLimit = memLimit
		}
	}

	if memUsage, err := readCgroupV2Int64("/sys/fs/cgroup/memory.current"); err == nil {
		limits.MemoryUsage = memUsage
	}

	if cpuMax, err := os.ReadFile("/sys/fs/cgroup/cpu.max"); err == nil {
		parts := strings.Fields(string(cpuMax))
		if len(parts) >= 2 {
			if parts[0] != "max" {
				if quota, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
					limits.CPUQuota = quota
				}
			}
			if period, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
				limits.CPUPeriod = period
			}
		}
	}

	if limits.CPUQuota > 0 && limits.CPUPeriod > 0 {
		limits.CPUCount = int((limits.CPUQuota + limits.CPUPeriod - 1) / limits.CPUPeriod)
		if limits.CPUCount < 1 {
			limits.CPUCount = 1
		}
	}

	return limits, nil
}

func detectCgroupV1Limits(limits *CgroupLimits) (*CgroupLimits, error) {
	cgroupPath, _ := getCgroupV1Path() // Ignore error, use empty path if failed

	if memLimit, err := readCgroupV1WithFallback("memory", cgroupPath, "memory.limit_in_bytes"); err == nil {
		if memLimit < unrestricted {
			limits.MemoryLimit = memLimit
		}
	}

	if memUsage, err := readCgroupV1WithFallback("memory", cgroupPath, "memory.usage_in_bytes"); err == nil {
		limits.MemoryUsage = memUsage
	}

	if cpuQuota, err := readCgroupV1CPUControllerInt64(cgroupPath, "cpu.cfs_quota_us"); err == nil {
		limits.CPUQuota = cpuQuota
	}

	if cpuPeriod, err := readCgroupV1CPUControllerInt64(cgroupPath, "cpu.cfs_period_us"); err == nil {
		limits.CPUPeriod = cpuPeriod
	}

	if limits.CPUQuota > 0 && limits.CPUPeriod > 0 {
		limits.CPUCount = int((limits.CPUQuota + limits.CPUPeriod - 1) / limits.CPUPeriod)
		if limits.CPUCount < 1 {
			limits.CPUCount = 1
		}
	}

	return limits, nil
}

func getCgroupV1Path() (string, error) {
	file, err := os.Open("/proc/self/cgroup")
	if err != nil {
		return "", err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, ":", 3)
		if len(parts) == 3 {
			if strings.Contains(parts[1], "memory") || strings.Contains(parts[1], "cpu") {
				return strings.TrimPrefix(parts[2], "/"), nil
			}
		}
	}

	return "", fmt.Errorf("cgroup path not found")
}

func readCgroupV1WithFallback(controller, cgroupPath, filename string) (int64, error) {
	// Try with cgroup path first
	if cgroupPath != "" {
		path := filepath.Join("/sys/fs/cgroup", controller, cgroupPath, filename)
		if val, err := readCgroupV1Int64(path); err == nil {
			return val, nil
		}
	}

	// Fallback to root of controller
	path := filepath.Join("/sys/fs/cgroup", controller, filename)
	return readCgroupV1Int64(path)
}

func readCgroupV1Int64(path string) (int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}

	value, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
	if err != nil {
		return 0, err
	}

	return value, nil
}

func readCgroupV2Int64(path string) (int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}

	content := strings.TrimSpace(string(data))
	if content == "max" {
		return unrestricted, nil
	}

	value, err := strconv.ParseInt(content, 10, 64)
	if err != nil {
		return 0, err
	}

	return value, nil
}

func readCgroupV2CPU() (int64, int64) {
	data, err := os.ReadFile("/sys/fs/cgroup/cpu.max")
	if err != nil {
		return -1, -1
	}

	parts := strings.Fields(string(data))
	if len(parts) < 2 {
		return -1, -1
	}

	var quota int64
	if parts[0] != "max" {
		if q, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
			quota = q
		}
	}

	period, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return -1, -1
	}

	return quota, period
}

func isFiniteLimit(value int64) bool {
	return value > 0 && value < unrestricted
}

func readCgroupV1CPUControllerInt64(cgroupPath, filename string) (int64, error) {
	controllers := []string{
		"cpu,cpuacct",
		"cpu",
		"cpuacct",
	}

	var lastErr error
	for _, controller := range controllers {
		value, err := readCgroupV1WithFallback(controller, cgroupPath, filename)
		if err == nil {
			return value, nil
		}
		lastErr = err
	}

	return 0, lastErr
}
