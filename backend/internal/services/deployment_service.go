package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type DeploymentService struct {
	db *database.DB
}

func NewDeploymentService(db *database.DB) *DeploymentService {
	return &DeploymentService{db: db}
}

func (s *DeploymentService) CreateDeployment(ctx context.Context, deployment *models.Deployment) (*models.Deployment, error) {
	deployment.ID = uuid.New().String()
	deployment.BaseModel = models.BaseModel{CreatedAt: time.Now()}

	if err := s.db.WithContext(ctx).Create(deployment).Error; err != nil {
		return nil, fmt.Errorf("failed to create deployment: %w", err)
	}

	return deployment, nil
}

func (s *DeploymentService) GetDeploymentByID(ctx context.Context, id string) (*models.Deployment, error) {
	var deployment models.Deployment
	if err := s.db.WithContext(ctx).Preload("Agent").Preload("Task").Where("id = ?", id).First(&deployment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("deployment not found")
		}
		return nil, fmt.Errorf("failed to get deployment: %w", err)
	}
	return &deployment, nil
}

func (s *DeploymentService) ListDeployments(ctx context.Context, agentID *string) ([]*models.Deployment, error) {
	query := s.db.WithContext(ctx).Preload("Agent").Preload("Task").Order("created_at DESC")

	if agentID != nil {
		query = query.Where("agent_id = ?", *agentID)
	}

	var deployments []*models.Deployment
	if err := query.Find(&deployments).Error; err != nil {
		return nil, fmt.Errorf("failed to list deployments: %w", err)
	}
	return deployments, nil
}

func (s *DeploymentService) UpdateDeploymentStatus(ctx context.Context, id string, status models.DeploymentStatus, error *string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if error != nil {
		updates["error"] = *error
	}

	if err := s.db.WithContext(ctx).Model(&models.Deployment{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update deployment status: %w", err)
	}

	return nil
}

func (s *DeploymentService) DeleteDeployment(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Deployment{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete deployment: %w", err)
	}
	return nil
}

// Helper methods for creating specific deployment types
func (s *DeploymentService) CreateStackDeployment(ctx context.Context, agentID, stackName, composeContent string, envContent *string, taskID *string) (*models.Deployment, error) {
	metadata := models.JSON{
		"stackName":      stackName,
		"composeContent": composeContent,
	}

	if envContent != nil {
		metadata["envContent"] = *envContent
	}

	deployment := &models.Deployment{
		Name:     stackName,
		Type:     models.DeploymentTypeStack,
		Status:   models.DeploymentStatusPending,
		AgentID:  agentID,
		TaskID:   taskID,
		Metadata: metadata,
	}

	return s.CreateDeployment(ctx, deployment)
}

func (s *DeploymentService) CreateContainerDeployment(ctx context.Context, agentID, containerName, imageName string, ports, volumes []string, taskID *string) (*models.Deployment, error) {
	metadata := models.JSON{
		"containerName": containerName,
		"imageName":     imageName,
		"ports":         ports,
		"volumes":       volumes,
	}

	deployment := &models.Deployment{
		Name:     containerName,
		Type:     models.DeploymentTypeContainer,
		Status:   models.DeploymentStatusPending,
		AgentID:  agentID,
		TaskID:   taskID,
		Metadata: metadata,
	}

	return s.CreateDeployment(ctx, deployment)
}

func (s *DeploymentService) CreateImageDeployment(ctx context.Context, agentID, imageName string, taskID *string) (*models.Deployment, error) {
	metadata := models.JSON{
		"imageName": imageName,
	}

	deployment := &models.Deployment{
		Name:     imageName,
		Type:     models.DeploymentTypeImage,
		Status:   models.DeploymentStatusPending,
		AgentID:  agentID,
		TaskID:   taskID,
		Metadata: metadata,
	}

	return s.CreateDeployment(ctx, deployment)
}
