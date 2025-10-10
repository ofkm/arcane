package docker

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
)

var (
	volumeUsageCache      []volume.Volume
	volumeUsageCacheMutex sync.RWMutex
	volumeUsageCacheTime  time.Time
	volumeUsageCacheTTL   = 30 * time.Second
)

func GetVolumeUsageData(ctx context.Context, dockerClient *client.Client) ([]volume.Volume, error) {
	volumeUsageCacheMutex.RLock()
	if time.Since(volumeUsageCacheTime) < volumeUsageCacheTTL && volumeUsageCache != nil {
		cached := volumeUsageCache
		volumeUsageCacheMutex.RUnlock()
		slog.DebugContext(ctx, "returning cached volume usage data", slog.Int("volume_count", len(cached)))
		return cached, nil
	}
	volumeUsageCacheMutex.RUnlock()

	volumeUsageCacheMutex.Lock()
	defer volumeUsageCacheMutex.Unlock()

	if time.Since(volumeUsageCacheTime) < volumeUsageCacheTTL && volumeUsageCache != nil {
		slog.DebugContext(ctx, "returning cached volume usage data after lock", slog.Int("volume_count", len(volumeUsageCache)))
		return volumeUsageCache, nil
	}
	diskUsage, err := dockerClient.DiskUsage(ctx, types.DiskUsageOptions{
		Types: []types.DiskUsageObject{types.VolumeObject},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get disk usage: %w", err)
	}

	slog.DebugContext(ctx, "disk usage returned volumes", slog.Int("volume_count", len(diskUsage.Volumes)))

	if diskUsage.Volumes == nil {
		return []volume.Volume{}, nil
	}

	volumes := make([]volume.Volume, 0, len(diskUsage.Volumes))
	for _, v := range diskUsage.Volumes {
		if v != nil {
			volumes = append(volumes, *v)
		}
	}

	volumeUsageCache = volumes
	volumeUsageCacheTime = time.Now()
	slog.DebugContext(ctx, "refreshed volume usage cache", slog.Int("volume_count", len(volumes)))

	return volumes, nil
}

func InvalidateVolumeUsageCache() {
	volumeUsageCacheMutex.Lock()
	defer volumeUsageCacheMutex.Unlock()
	volumeUsageCache = nil
	volumeUsageCacheTime = time.Time{}
}

func SetVolumeUsageCacheTTL(ttl time.Duration) {
	volumeUsageCacheMutex.Lock()
	defer volumeUsageCacheMutex.Unlock()
	volumeUsageCacheTTL = ttl
}
