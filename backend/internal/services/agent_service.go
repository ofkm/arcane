package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type AgentService struct {
	db *database.DB
}

func NewAgentService(db *database.DB) *AgentService {
	return &AgentService{db: db}
}

// Agent management
func (s *AgentService) RegisterAgent(ctx context.Context, agent *models.Agent) (*models.Agent, error) {
	existing, err := s.GetAgentByID(ctx, agent.ID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing agent: %w", err)
	}

	now := time.Now()
	if existing != nil {
		// Update existing agent - fix field names
		existing.IsActive = true
		existing.LastPing = &now
		updateTime := time.Now()
		existing.UpdatedAt = &updateTime

		if err := s.db.WithContext(ctx).Save(existing).Error; err != nil {
			return nil, fmt.Errorf("failed to update agent: %w", err)
		}
		return existing, nil
	} else {
		// Create new agent - fix field names
		agent.IsActive = true
		agent.LastPing = &now
		agent.BaseModel = models.BaseModel{CreatedAt: time.Now()}

		if err := s.db.WithContext(ctx).Create(agent).Error; err != nil {
			return nil, fmt.Errorf("failed to create agent: %w", err)
		}
		return agent, nil
	}
}

func (s *AgentService) GetAgentByID(ctx context.Context, id string) (*models.Agent, error) {
	var agent models.Agent
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&agent).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("agent not found")
		}
		return nil, fmt.Errorf("failed to get agent: %w", err)
	}
	return &agent, nil
}

func (s *AgentService) ListAgents(ctx context.Context) ([]*models.Agent, error) {
	var agents []*models.Agent
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&agents).Error; err != nil {
		return nil, fmt.Errorf("failed to list agents: %w", err)
	}
	return agents, nil
}

func (s *AgentService) UpdateAgentHeartbeat(ctx context.Context, agentID string) error {
	now := time.Now()
	if err := s.db.WithContext(ctx).Model(&models.Agent{}).Where("id = ?", agentID).Updates(map[string]interface{}{
		"last_ping": &now,
		"is_active": true,
	}).Error; err != nil {
		return fmt.Errorf("failed to update agent heartbeat: %w", err)
	}
	return nil
}

func (s *AgentService) UpdateAgentMetrics(ctx context.Context, agentID string, metrics *models.AgentMetrics, dockerInfo *models.DockerInfo) error {
	now := time.Now()
	updates := map[string]interface{}{
		"last_ping": &now,
	}

	if dockerInfo != nil {
		updates["version"] = dockerInfo.Version
	}

	if err := s.db.WithContext(ctx).Model(&models.Agent{}).Where("id = ?", agentID).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update agent metrics: %w", err)
	}
	return nil
}

func (s *AgentService) DeleteAgent(ctx context.Context, agentID string) error {
	// Delete all related tasks first
	if err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Delete(&models.AgentTask{}).Error; err != nil {
		return fmt.Errorf("failed to delete agent tasks: %w", err)
	}

	// Delete all related tokens
	if err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Delete(&models.AgentToken{}).Error; err != nil {
		return fmt.Errorf("failed to delete agent tokens: %w", err)
	}

	// Update stacks to remove agent reference (don't delete the stacks)
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("agent_id = ?", agentID).Update("agent_id", nil).Error; err != nil {
		return fmt.Errorf("failed to update stacks: %w", err)
	}

	// Delete the agent
	if err := s.db.WithContext(ctx).Delete(&models.Agent{}, "id = ?", agentID).Error; err != nil {
		return fmt.Errorf("failed to delete agent: %w", err)
	}

	return nil
}

// Task management
func (s *AgentService) CreateTask(ctx context.Context, agentID string, taskType models.AgentTaskType, payload map[string]interface{}) (*models.AgentTask, error) {
	// Verify agent exists and is online
	agent, err := s.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("agent %s not found: %w", agentID, err)
	}

	if !s.IsAgentOnline(agent, 5) { // 5 is a default timeout in minutes, adjust as needed
		return nil, fmt.Errorf("agent %s is not online", agentID)
	}

	task := &models.AgentTask{
		ID:      uuid.New().String(),
		AgentID: agentID,
		Type:    taskType,
		Payload: payload,
		Status:  models.TaskStatusPending,
		BaseModel: models.BaseModel{
			CreatedAt: time.Now(),
		},
	}

	if err := s.db.WithContext(ctx).Create(task).Error; err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

func (s *AgentService) GetTaskByID(ctx context.Context, taskID string) (*models.AgentTask, error) {
	var task models.AgentTask
	if err := s.db.WithContext(ctx).Where("id = ?", taskID).First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("task not found")
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}
	return &task, nil
}

func (s *AgentService) ListTasks(ctx context.Context, agentID *string) ([]*models.AgentTask, error) {
	query := s.db.WithContext(ctx).Order("created_at DESC")

	if agentID != nil {
		query = query.Where("agent_id = ?", *agentID)
	}

	var tasks []*models.AgentTask
	if err := query.Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	return tasks, nil
}

func (s *AgentService) GetPendingTasks(ctx context.Context, agentID string) ([]*models.AgentTask, error) {
	var tasks []*models.AgentTask
	if err := s.db.WithContext(ctx).
		Where("agent_id = ? AND status = ?", agentID, models.TaskStatusPending).
		Order("created_at ASC").
		Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to get pending tasks: %w", err)
	}
	return tasks, nil
}

func (s *AgentService) UpdateTaskStatus(ctx context.Context, taskID string, status models.AgentTaskStatus, result map[string]interface{}, taskError *string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if result != nil {
		updates["result"] = result
	}

	if taskError != nil {
		updates["error"] = *taskError
	}

	now := time.Now().Unix()
	if status == models.TaskStatusRunning && updates["started_at"] == nil {
		updates["started_at"] = now
	}

	if status == models.TaskStatusCompleted || status == models.TaskStatusFailed {
		updates["completed_at"] = now
	}

	if err := s.db.WithContext(ctx).Model(&models.AgentTask{}).Where("id = ?", taskID).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	return nil
}

// Convenience methods for specific task types
func (s *AgentService) SendDockerCommand(ctx context.Context, agentID, command string, args []string) (*models.AgentTask, error) {
	payload := map[string]interface{}{
		"command": command,
		"args":    args,
	}
	return s.CreateTask(ctx, agentID, models.TaskDockerCommand, payload)
}

func (s *AgentService) DeployStackToAgent(ctx context.Context, agentID, stackName, composeContent string, envContent *string) (*models.AgentTask, error) {
	payload := map[string]interface{}{
		"project_name":    stackName,
		"compose_content": composeContent,
	}

	if envContent != nil {
		// Parse env content into key-value pairs
		envVars := make(map[string]string)
		lines := strings.Split(*envContent, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && !strings.HasPrefix(line, "#") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					envVars[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
				}
			}
		}
		payload["env_vars"] = envVars
	}

	return s.CreateTask(ctx, agentID, models.TaskComposeCreateProject, payload)
}

func (s *AgentService) StartStackOnAgent(ctx context.Context, agentID, stackName string) (*models.AgentTask, error) {
	payload := map[string]interface{}{
		"project_name": stackName,
	}
	return s.CreateTask(ctx, agentID, models.TaskComposeUp, payload)
}

func (s *AgentService) PullImageOnAgent(ctx context.Context, agentID, imageName string) (*models.AgentTask, error) {
	payload := map[string]interface{}{
		"imageName": imageName,
	}
	return s.CreateTask(ctx, agentID, models.TaskImagePull, payload)
}

func (s *AgentService) SendHealthCheck(ctx context.Context, agentID string) (*models.AgentTask, error) {
	return s.CreateTask(ctx, agentID, models.TaskHealthCheck, map[string]interface{}{})
}

func (s *AgentService) GetStackList(ctx context.Context, agentID string) (*models.AgentTask, error) {
	return s.CreateTask(ctx, agentID, models.TaskStackList, map[string]interface{}{})
}

// Token management
func (s *AgentService) CreateAgentToken(ctx context.Context, agentID, token, name string, permissions []string) (*models.AgentToken, error) {
	agentToken := &models.AgentToken{
		ID:          uuid.New().String(),
		AgentID:     agentID,
		Token:       token,
		Name:        &name,
		Permissions: permissions,
		IsActive:    true,
		BaseModel:   models.BaseModel{CreatedAt: time.Now()},
	}

	if err := s.db.WithContext(ctx).Create(agentToken).Error; err != nil {
		return nil, fmt.Errorf("failed to create agent token: %w", err)
	}

	return agentToken, nil
}

func (s *AgentService) GetAgentByToken(ctx context.Context, token string) (*models.Agent, error) {
	var agentToken models.AgentToken
	if err := s.db.WithContext(ctx).Preload("Agent").Where("token = ? AND is_active = ?", token, true).First(&agentToken).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid token")
		}
		return nil, fmt.Errorf("failed to get agent by token: %w", err)
	}

	// Update last used
	now := time.Now().Unix()
	s.db.WithContext(ctx).Model(&agentToken).Update("last_used", now)

	return &agentToken.Agent, nil
}

// Online status checking
func (s *AgentService) IsAgentOnline(agent *models.Agent, timeoutMinutes int) bool {
	if !agent.IsActive {
		return false
	}

	if agent.LastPing == nil {
		return false
	}

	timeoutDuration := time.Duration(timeoutMinutes) * time.Minute
	return time.Since(*agent.LastPing) < timeoutDuration
}

func (s *AgentService) GetOnlineAgents(ctx context.Context, timeoutMinutes int) ([]*models.Agent, error) {
	allAgents, err := s.ListAgents(ctx)
	if err != nil {
		return nil, err
	}

	var onlineAgents []*models.Agent
	for _, agent := range allAgents {
		if s.IsAgentOnline(agent, timeoutMinutes) {
			onlineAgents = append(onlineAgents, agent)
		}
	}

	return onlineAgents, nil
}
