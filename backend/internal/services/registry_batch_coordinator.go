package services

import (
	"context"
	"log/slog"

	"github.com/ofkm/arcane-backend/internal/dto"
)

// RegistryBatchCoordinator coordinates batching of image checks by registry
type RegistryBatchCoordinator struct {
	imageUpdateService *ImageUpdateService
}

// NewRegistryBatchCoordinator creates a new registry batch coordinator
func NewRegistryBatchCoordinator(imageUpdateService *ImageUpdateService) *RegistryBatchCoordinator {
	return &RegistryBatchCoordinator{
		imageUpdateService: imageUpdateService,
	}
}

// CheckImagesWithBatching checks multiple images with registry-level batching
// This leverages the existing batching logic in ImageUpdateService.CheckMultipleImages
func (c *RegistryBatchCoordinator) CheckImagesWithBatching(
	ctx context.Context,
	imageRefs []string,
	credentials []dto.ContainerRegistryCredential,
) (map[string]*dto.ImageUpdateResponse, error) {
	if len(imageRefs) == 0 {
		return make(map[string]*dto.ImageUpdateResponse), nil
	}

	slog.DebugContext(ctx, "Registry batch coordinator checking images",
		slog.Int("imageCount", len(imageRefs)),
		slog.Int("credentialCount", len(credentials)))

	// Delegate to the existing CheckMultipleImages method which already implements:
	// 1. Parsing and grouping images by registry
	// 2. Building registry auth map with batched authentication
	// 3. Concurrent checking within each registry
	// 4. Saving results to database
	results, err := c.imageUpdateService.CheckMultipleImages(ctx, imageRefs, credentials)
	if err != nil {
		slog.ErrorContext(ctx, "Registry batch coordinator failed",
			slog.String("error", err.Error()))
		return nil, err
	}

	slog.InfoContext(ctx, "Registry batch coordinator completed",
		slog.Int("totalImages", len(imageRefs)),
		slog.Int("results", len(results)))

	return results, nil
}
