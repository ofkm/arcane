package upgrade

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/spf13/cobra"
)

var (
	containerName string
	targetImage   string
	autoDetect    bool
)

var UpgradeCmd = &cobra.Command{
	Use:   "upgrade",
	Short: "Upgrade an Arcane container to the latest version",
	Long: `Upgrade an Arcane container by pulling the latest image and recreating the container.
This command should be run from outside the container (e.g., from the host or another container).`,
	Example: `  # Auto-detect and upgrade the Arcane container
  arcane upgrade --auto

  # Upgrade a specific container
  arcane upgrade --container arcane

  # Upgrade to a specific image tag
  arcane upgrade --container arcane --image ghcr.io/ofkm/arcane:v1.2.3`,
	RunE: runUpgrade,
}

func init() {
	UpgradeCmd.Flags().StringVarP(&containerName, "container", "c", "", "Name of the container to upgrade")
	UpgradeCmd.Flags().StringVarP(&targetImage, "image", "i", "", "Target image to upgrade to (defaults to current tag)")
	UpgradeCmd.Flags().BoolVarP(&autoDetect, "auto", "a", false, "Auto-detect Arcane container")
}

func runUpgrade(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()

	// Connect to Docker
	dockerClient, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	// Find the container
	var targetContainer container.InspectResponse
	if autoDetect || containerName == "" {
		slog.Info("Auto-detecting Arcane container...")
		targetContainer, err = findArcaneContainer(ctx, dockerClient)
		if err != nil {
			return fmt.Errorf("failed to find Arcane container: %w", err)
		}
		containerName = strings.TrimPrefix(targetContainer.Name, "/")
		slog.Info("Found Arcane container", "name", containerName, "id", targetContainer.ID[:12])
	} else {
		targetContainer, err = dockerClient.ContainerInspect(ctx, containerName)
		if err != nil {
			return fmt.Errorf("failed to inspect container %s: %w", containerName, err)
		}
	}

	// Determine image to pull
	imageToPull := targetImage
	if imageToPull == "" {
		imageToPull = determineImageName(ctx, dockerClient, targetContainer)
		slog.Info("Determined image to pull", "image", imageToPull)
	}

	// Pull the new image
	slog.Info("Pulling new image", "image", imageToPull)
	if err := pullImage(ctx, dockerClient, imageToPull); err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}

	// Perform the upgrade
	slog.Info("Starting container upgrade", "container", containerName)
	if err := upgradeContainer(ctx, dockerClient, targetContainer, imageToPull); err != nil {
		return fmt.Errorf("failed to upgrade container: %w", err)
	}

	slog.Info("Upgrade completed successfully", "container", containerName, "image", imageToPull)
	return nil
}

func findArcaneContainer(ctx context.Context, dockerClient *client.Client) (container.InspectResponse, error) {
	// Look for containers with "arcane" in the image name
	filter := filters.NewArgs()
	filter.Add("status", "running")

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{Filters: filter})
	if err != nil {
		return container.InspectResponse{}, err
	}

	for _, c := range containers {
		if strings.Contains(strings.ToLower(c.Image), "arcane") {
			return dockerClient.ContainerInspect(ctx, c.ID)
		}
	}

	return container.InspectResponse{}, fmt.Errorf("no running Arcane container found")
}

func determineImageName(ctx context.Context, dockerClient *client.Client, cont container.InspectResponse) string {
	imageName := ""
	if cont.Config != nil {
		imageName = strings.TrimSpace(cont.Config.Image)
	}

	// Strip digest
	if idx := strings.Index(imageName, "@"); idx != -1 {
		imageName = imageName[:idx]
	}

	// Check if it has a tag
	hasExplicitTag := func(ref string) bool {
		if ref == "" {
			return false
		}
		slash := strings.LastIndex(ref, "/")
		colon := strings.LastIndex(ref, ":")
		return colon > slash
	}

	// If no explicit tag, try to infer from image RepoTags
	if !hasExplicitTag(imageName) {
		if ii, err := dockerClient.ImageInspect(ctx, cont.Image); err == nil {
			var arcaneNonLatest string
			var arcaneAny string
			for _, t := range ii.RepoTags {
				if t == "" || t == "<none>:<none>" {
					continue
				}
				if idx := strings.Index(t, "@"); idx != -1 {
					t = t[:idx]
				}
				if strings.Contains(t, "arcane") {
					if arcaneAny == "" {
						arcaneAny = t
					}
					if !strings.HasSuffix(t, ":latest") && arcaneNonLatest == "" {
						arcaneNonLatest = t
					}
				}
			}
			if arcaneNonLatest != "" {
				imageName = arcaneNonLatest
			} else if arcaneAny != "" {
				imageName = arcaneAny
			}
		}
	}

	// Default to :latest if still no tag
	if !hasExplicitTag(imageName) {
		if imageName == "" {
			imageName = "ghcr.io/ofkm/arcane:latest"
		} else {
			imageName += ":latest"
		}
	}

	return imageName
}

func pullImage(ctx context.Context, dockerClient *client.Client, imageName string) error {
	reader, err := dockerClient.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()

	// Copy output to discard but wait for completion
	_, err = io.Copy(io.Discard, reader)
	return err
}

func upgradeContainer(ctx context.Context, dockerClient *client.Client, oldContainer container.InspectResponse, newImage string) error {
	originalName := strings.TrimPrefix(oldContainer.Name, "/")
	tempName := fmt.Sprintf("%s-upgrading", originalName)

	// Create new container config
	config := *oldContainer.Config
	config.Image = newImage

	hostConfig := oldContainer.HostConfig

	// Build network config
	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: make(map[string]*network.EndpointSettings),
	}
	for networkName, networkSettings := range oldContainer.NetworkSettings.Networks {
		networkConfig.EndpointsConfig[networkName] = &network.EndpointSettings{
			Aliases: networkSettings.Aliases,
		}
	}

	fmt.Println("PROGRESS:70:Stopping old container")
	slog.Info("Stopping old container", "name", originalName)
	timeout := 10
	if err := dockerClient.ContainerStop(ctx, oldContainer.ID, container.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("stop old container: %w", err)
	}

	fmt.Println("PROGRESS:75:Creating new container")
	slog.Info("Creating new container", "tempName", tempName)
	resp, err := dockerClient.ContainerCreate(ctx, &config, hostConfig, networkConfig, nil, tempName)
	if err != nil {
		// Try to restart old container on failure
		_ = dockerClient.ContainerStart(ctx, oldContainer.ID, container.StartOptions{})
		return fmt.Errorf("create new container: %w", err)
	}

	fmt.Println("PROGRESS:80:Starting new container")
	slog.Info("Starting new container", "id", resp.ID[:12])
	if err := dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		// Cleanup new container and restart old one
		_ = dockerClient.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		_ = dockerClient.ContainerStart(ctx, oldContainer.ID, container.StartOptions{})
		return fmt.Errorf("start new container: %w", err)
	}

	// Wait a moment for the new container to initialize
	// Wait a moment for the new container to initialize
	fmt.Println("PROGRESS:85:Waiting for container to start")
	time.Sleep(2 * time.Second)

	fmt.Println("PROGRESS:90:Removing old container")
	slog.Info("Removing old container", "id", oldContainer.ID[:12])
	if err := dockerClient.ContainerRemove(ctx, oldContainer.ID, container.RemoveOptions{}); err != nil {
		slog.Warn("Failed to remove old container", "error", err)
	}

	fmt.Println("PROGRESS:95:Renaming new container")
	slog.Info("Renaming new container", "from", tempName, "to", originalName)
	if err := dockerClient.ContainerRename(ctx, resp.ID, originalName); err != nil {
		slog.Warn("Failed to rename container", "error", err)
	}

	return nil
}
