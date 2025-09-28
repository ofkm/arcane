package bootstrap

import (
	"context"
	"log/slog"
)

func PerformInitialDockerSyncs(appCtx context.Context, appServices *Services) {
	slog.InfoContext(appCtx, "Performing initial Docker image synchronization with the database")
	if err := appServices.Image.SyncDockerImages(appCtx); err != nil {
		slog.WarnContext(appCtx, "Initial Docker image synchronization failed, image data may be stale",
			slog.String("error", err.Error()))
	} else {
		slog.InfoContext(appCtx, "Initial Docker image synchronization complete")
	}

	if err := appServices.Network.SyncDockerNetworks(appCtx); err != nil {
		slog.WarnContext(appCtx, "Initial Docker network synchronization failed, network data may be stale",
			slog.String("error", err.Error()))
	} else {
		slog.InfoContext(appCtx, "Initial Docker network synchronization complete")
	}

	if err := appServices.Volume.SyncDockerVolumes(appCtx); err != nil {
		slog.WarnContext(appCtx, "Initial Docker volume synchronization failed, volume data may be stale",
			slog.String("error", err.Error()))
	} else {
		slog.InfoContext(appCtx, "Initial Docker volume synchronization complete")
	}

	if err := appServices.Container.SyncDockerContainers(appCtx); err != nil {
		slog.WarnContext(appCtx, "Initial Docker container synchronization failed, container data may be stale",
			slog.String("error", err.Error()))
	} else {
		slog.InfoContext(appCtx, "Initial Docker container synchronization complete")
	}
}
