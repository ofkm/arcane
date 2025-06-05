package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type StackService struct {
	db *database.DB
}

func NewStackService(db *database.DB) *StackService {
	return &StackService{db: db}
}

// Create operations
func (s *StackService) CreateStack(ctx context.Context, name, composeContent string, envContent *string, path string) (*models.Stack, error) {
	stack := &models.Stack{
		ID:             uuid.New().String(),
		Name:           name,
		Path:           path,
		ComposeContent: &composeContent,
		EnvContent:     envContent,
		Status:         models.StackStatusStopped,
		IsExternal:     false,
		IsLegacy:       false,
		IsRemote:       false,
		ServiceCount:   0,
		RunningCount:   0,
		BaseModel: models.BaseModel{
			CreatedAt: time.Now(),
		},
	}

	if err := s.db.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to create stack: %w", err)
	}

	return stack, nil
}

// Read operations
func (s *StackService) GetStackByID(ctx context.Context, id string) (*models.Stack, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Preload("Agent").Where("id = ?", id).First(&stack).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("stack not found")
		}
		return nil, fmt.Errorf("failed to get stack: %w", err)
	}
	return &stack, nil
}

func (s *StackService) GetStackByName(ctx context.Context, name string) (*models.Stack, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Preload("Agent").Where("name = ?", name).First(&stack).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("stack not found")
		}
		return nil, fmt.Errorf("failed to get stack: %w", err)
	}
	return &stack, nil
}

func (s *StackService) ListStacks(ctx context.Context) ([]*models.Stack, error) {
	var stacks []*models.Stack
	if err := s.db.WithContext(ctx).Preload("Agent").Order("created_at DESC").Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to list stacks: %w", err)
	}
	return stacks, nil
}

func (s *StackService) GetStacksByAgent(ctx context.Context, agentID string) ([]*models.Stack, error) {
	var stacks []*models.Stack
	if err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to get stacks by agent: %w", err)
	}
	return stacks, nil
}

// Update operations
func (s *StackService) UpdateStack(ctx context.Context, stack *models.Stack) (*models.Stack, error) {
	now := time.Now()
	stack.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to update stack: %w", err)
	}
	return stack, nil
}

func (s *StackService) UpdateStackStatus(ctx context.Context, id string, status models.StackStatus) error {
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("failed to update stack status: %w", err)
	}
	return nil
}

func (s *StackService) UpdateStackContent(ctx context.Context, id, composeContent string, envContent *string) error {
	updates := map[string]interface{}{
		"compose_content": composeContent,
		"updated_at":      time.Now(),
	}

	if envContent != nil {
		updates["env_content"] = *envContent
	}

	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update stack content: %w", err)
	}
	return nil
}

func (s *StackService) UpdateStackRuntimeInfo(ctx context.Context, id string, serviceCount, runningCount int, status models.StackStatus) error {
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Updates(map[string]interface{}{
		"service_count": serviceCount,
		"running_count": runningCount,
		"status":        status,
		"last_polled":   time.Now().Unix(),
		"updated_at":    time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("failed to update stack runtime info: %w", err)
	}
	return nil
}

// Delete operations
func (s *StackService) DeleteStack(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Stack{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete stack: %w", err)
	}
	return nil
}

// Stack actions
func (s *StackService) DeployStack(ctx context.Context, id string, profiles []string, envOverrides map[string]string) error {
	// TODO: Implement actual Docker deployment logic
	return s.UpdateStackStatus(ctx, id, models.StackStatusRunning)
}

func (s *StackService) StopStack(ctx context.Context, id string) error {
	// TODO: Implement actual Docker stop logic
	return s.UpdateStackStatus(ctx, id, models.StackStatusStopped)
}

func (s *StackService) RestartStack(ctx context.Context, id string) error {
	// TODO: Implement actual Docker restart logic
	if err := s.StopStack(ctx, id); err != nil {
		return err
	}
	return s.DeployStack(ctx, id, nil, nil)
}

func (s *StackService) PullStackImages(ctx context.Context, id string) error {
	// TODO: Implement actual Docker pull logic
	return nil
}

// Auto-update operations
func (s *StackService) UpdateStackAutoUpdate(ctx context.Context, id string, autoUpdate bool) error {
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Update("auto_update", autoUpdate).Error; err != nil {
		return fmt.Errorf("failed to update stack auto-update: %w", err)
	}
	return nil
}

func (s *StackService) GetAutoUpdateStacks(ctx context.Context) ([]*models.Stack, error) {
	var stacks []*models.Stack
	if err := s.db.WithContext(ctx).Where("auto_update = ?", true).Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to get auto-update stacks: %w", err)
	}
	return stacks, nil
}

// File operations
func (s *StackService) EnsureStackDirectory(stackID string) (string, error) {
	// TODO: Get from settings
	stacksDir := "/tmp/stacks" // This should come from settings
	stackDir := filepath.Join(stacksDir, stackID)

	if err := os.MkdirAll(stackDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create stack directory: %w", err)
	}

	return stackDir, nil
}

func (s *StackService) SaveStackFiles(stackID, composeContent string, envContent *string) error {
	stackDir, err := s.EnsureStackDirectory(stackID)
	if err != nil {
		return err
	}

	// Save compose file
	composePath := filepath.Join(stackDir, "compose.yaml")
	if err := os.WriteFile(composePath, []byte(composeContent), 0644); err != nil {
		return fmt.Errorf("failed to save compose file: %w", err)
	}

	// Save env file if provided
	if envContent != nil && *envContent != "" {
		envPath := filepath.Join(stackDir, ".env")
		if err := os.WriteFile(envPath, []byte(*envContent), 0644); err != nil {
			return fmt.Errorf("failed to save env file: %w", err)
		}
	}

	return nil
}
