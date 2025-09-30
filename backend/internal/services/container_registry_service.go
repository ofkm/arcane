package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type ContainerRegistryService struct {
	db *database.DB
}

func NewContainerRegistryService(db *database.DB) *ContainerRegistryService {
	return &ContainerRegistryService{db: db}
}

func (s *ContainerRegistryService) GetAllRegistries(ctx context.Context) ([]models.ContainerRegistry, error) {
	var registries []models.ContainerRegistry
	if err := s.db.WithContext(ctx).Find(&registries).Error; err != nil {
		return nil, fmt.Errorf("failed to get container registries: %w", err)
	}
	return registries, nil
}

func (s *ContainerRegistryService) GetRegistriesPaginated(ctx context.Context, params pagination.QueryParams) ([]dto.ContainerRegistryDto, pagination.Response, error) {
	var registries []models.ContainerRegistry
	q := s.db.WithContext(ctx).Model(&models.ContainerRegistry{})

	if term := strings.TrimSpace(params.Search); term != "" {
		searchPattern := "%" + term + "%"
		q = q.Where(
			"url LIKE ? OR username LIKE ? OR COALESCE(description, '') LIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	if enabled := params.Filters["enabled"]; enabled != "" {
		switch enabled {
		case "true", "1":
			q = q.Where("enabled = ?", true)
		case "false", "0":
			q = q.Where("enabled = ?", false)
		}
	}

	if insecure := params.Filters["insecure"]; insecure != "" {
		switch insecure {
		case "true", "1":
			q = q.Where("insecure = ?", true)
		case "false", "0":
			q = q.Where("insecure = ?", false)
		}
	}

	paginationResp, err := pagination.PaginateAndSortDB(params, q, &registries)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to paginate container registries: %w", err)
	}

	out, mapErr := dto.MapSlice[models.ContainerRegistry, dto.ContainerRegistryDto](registries)
	if mapErr != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to map registries: %w", mapErr)
	}

	return out, paginationResp, nil
}

func (s *ContainerRegistryService) GetRegistryByID(ctx context.Context, id string) (*models.ContainerRegistry, error) {
	var registry models.ContainerRegistry
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&registry).Error; err != nil {
		return nil, fmt.Errorf("failed to get container registry: %w", err)
	}
	return &registry, nil
}

func (s *ContainerRegistryService) CreateRegistry(ctx context.Context, req models.CreateContainerRegistryRequest) (*models.ContainerRegistry, error) {
	// Encrypt the token before storing
	encryptedToken, err := utils.Encrypt(req.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt token: %w", err)
	}

	registry := &models.ContainerRegistry{
		URL:         req.URL,
		Username:    req.Username,
		Token:       encryptedToken,
		Description: req.Description,
		Insecure:    req.Insecure != nil && *req.Insecure,
		Enabled:     req.Enabled == nil || *req.Enabled,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(registry).Error; err != nil {
		return nil, fmt.Errorf("failed to create registry: %w", err)
	}

	return registry, nil
}

func (s *ContainerRegistryService) UpdateRegistry(ctx context.Context, id string, req models.UpdateContainerRegistryRequest) (*models.ContainerRegistry, error) {
	registry, err := s.GetRegistryByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Update fields
	if req.URL != nil {
		registry.URL = *req.URL
	}
	if req.Username != nil {
		registry.Username = *req.Username
	}
	if req.Token != nil && *req.Token != "" {
		// Encrypt the new token
		encryptedToken, err := utils.Encrypt(*req.Token)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt token: %w", err)
		}
		registry.Token = encryptedToken
	}
	if req.Description != nil {
		registry.Description = req.Description
	}
	if req.Insecure != nil {
		registry.Insecure = *req.Insecure
	}
	if req.Enabled != nil {
		registry.Enabled = *req.Enabled
	}

	registry.UpdatedAt = time.Now()

	if err := s.db.WithContext(ctx).Save(registry).Error; err != nil {
		return nil, fmt.Errorf("failed to update registry: %w", err)
	}

	return registry, nil
}

func (s *ContainerRegistryService) DeleteRegistry(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.ContainerRegistry{}).Error; err != nil {
		return fmt.Errorf("failed to delete container registry: %w", err)
	}
	return nil
}

// GetDecryptedToken returns the decrypted token for a registry
func (s *ContainerRegistryService) GetDecryptedToken(ctx context.Context, id string) (string, error) {
	registry, err := s.GetRegistryByID(ctx, id)
	if err != nil {
		return "", err
	}

	decryptedToken, err := utils.Decrypt(registry.Token)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt token: %w", err)
	}

	return decryptedToken, nil
}

// GetEnabledRegistries returns all enabled registries
func (s *ContainerRegistryService) GetEnabledRegistries(ctx context.Context) ([]models.ContainerRegistry, error) {
	var registries []models.ContainerRegistry
	if err := s.db.WithContext(ctx).Where("enabled = ?", true).Find(&registries).Error; err != nil {
		return nil, fmt.Errorf("failed to get enabled container registries: %w", err)
	}
	return registries, nil
}
