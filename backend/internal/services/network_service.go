package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type NetworkService struct {
	db *database.DB
}

func NewNetworkService(db *database.DB) *NetworkService {
	return &NetworkService{db: db}
}

func (s *NetworkService) ListNetworks(ctx context.Context) ([]*models.Network, error) {
	var networks []*models.Network
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&networks).Error; err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}
	return networks, nil
}

func (s *NetworkService) GetNetworkByID(ctx context.Context, id string) (*models.Network, error) {
	var network models.Network
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&network).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("network not found")
		}
		return nil, fmt.Errorf("failed to get network: %w", err)
	}
	return &network, nil
}

func (s *NetworkService) GetNetworkByName(ctx context.Context, name string) (*models.Network, error) {
	var network models.Network
	if err := s.db.WithContext(ctx).Where("name = ?", name).First(&network).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("network not found")
		}
		return nil, fmt.Errorf("failed to get network: %w", err)
	}
	return &network, nil
}

func (s *NetworkService) CreateNetwork(ctx context.Context, network *models.Network) (*models.Network, error) {
	network.BaseModel = models.BaseModel{CreatedAt: time.Now()}

	if err := s.db.WithContext(ctx).Create(network).Error; err != nil {
		return nil, fmt.Errorf("failed to create network: %w", err)
	}
	return network, nil
}

func (s *NetworkService) UpdateNetwork(ctx context.Context, network *models.Network) (*models.Network, error) {
	now := time.Now()
	network.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(network).Error; err != nil {
		return nil, fmt.Errorf("failed to update network: %w", err)
	}
	return network, nil
}

func (s *NetworkService) DeleteNetwork(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Network{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete network: %w", err)
	}
	return nil
}

func (s *NetworkService) GetNetworksByDriver(ctx context.Context, driver string) ([]*models.Network, error) {
	var networks []*models.Network
	if err := s.db.WithContext(ctx).Where("driver = ?", driver).Find(&networks).Error; err != nil {
		return nil, fmt.Errorf("failed to get networks by driver: %w", err)
	}
	return networks, nil
}

func (s *NetworkService) GetDefaultNetworks(ctx context.Context) ([]*models.Network, error) {
	defaultNames := []string{"bridge", "host", "none", "ingress"}
	var networks []*models.Network
	if err := s.db.WithContext(ctx).Where("name IN ?", defaultNames).Find(&networks).Error; err != nil {
		return nil, fmt.Errorf("failed to get default networks: %w", err)
	}
	return networks, nil
}
