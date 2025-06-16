package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

type AgentResourceService struct {
	db           *database.DB
	agentService *AgentService
}

func NewAgentResourceService(db *database.DB, agentService *AgentService) *AgentResourceService {
	return &AgentResourceService{
		db:           db,
		agentService: agentService,
	}
}

func (s *AgentResourceService) SyncAgentResources(ctx context.Context, agentID string) error {
	resourceTypes := []string{"containers", "images", "networks", "volumes", "stacks"}

	for _, resourceType := range resourceTypes {
		if err := s.syncResourceType(ctx, agentID, resourceType); err != nil {
			return fmt.Errorf("failed to sync %s for agent %s: %w", resourceType, agentID, err)
		}
	}

	return nil
}

func (s *AgentResourceService) syncResourceType(ctx context.Context, agentID, resourceType string) error {
	var task *models.AgentTask
	var err error

	switch resourceType {
	case "containers":
		task, err = s.agentService.SendDockerCommand(ctx, agentID, "ps", []string{"-a"})
	case "images":
		task, err = s.agentService.SendDockerCommand(ctx, agentID, "images", []string{})
	case "networks":
		task, err = s.agentService.SendDockerCommand(ctx, agentID, "network", []string{"ls"})
	case "volumes":
		task, err = s.agentService.SendDockerCommand(ctx, agentID, "volume", []string{"ls"})
	case "stacks":
		task, err = s.agentService.CreateTask(ctx, agentID, models.TaskStackList, map[string]interface{}{})
	default:
		return fmt.Errorf("unknown resource type: %s", resourceType)
	}

	if err != nil {
		return err
	}

	result, err := s.waitForTaskResult(ctx, task.ID, 30*time.Second)
	if err != nil {
		return err
	}

	return s.storeResourceData(ctx, agentID, resourceType, result)
}

func (s *AgentResourceService) waitForTaskResult(ctx context.Context, taskID string, timeout time.Duration) (map[string]interface{}, error) {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		task, err := s.agentService.GetTaskByID(ctx, taskID)
		if err != nil {
			return nil, err
		}

		if task.Status == models.TaskStatusCompleted {
			var result map[string]interface{}
			if task.Result != nil {
				taskResult := map[string]interface{}(task.Result)

				if output, exists := taskResult["output"]; exists {
					if outputStr, ok := output.(string); ok {
						result = s.parseDockerOutput(outputStr, taskResult)
					} else {
						result = taskResult
					}
				} else {
					result = taskResult
				}
			}
			return result, nil
		}

		if task.Status == models.TaskStatusFailed {
			errorMsg := ""
			if task.Error != nil {
				errorMsg = *task.Error
			}
			return nil, fmt.Errorf("task failed: %s", errorMsg)
		}

		time.Sleep(1 * time.Second)
	}

	return nil, fmt.Errorf("task timeout")
}

func (s *AgentResourceService) ProcessTaskResult(ctx context.Context, agentID, resourceType string, taskResult map[string]interface{}) error {
	fmt.Printf("[DEBUG] Processing task result for %s/%s: %+v\n", agentID, resourceType, taskResult)

	parsedData := s.parseDockerOutput("", taskResult)
	return s.storeResourceData(ctx, agentID, resourceType, parsedData)
}

func (s *AgentResourceService) parseDockerOutput(output string, taskResult map[string]interface{}) map[string]interface{} {
	command, _ := taskResult["command"].(string)
	outputStr, _ := taskResult["output"].(string)

	if outputStr == "" {
		outputStr = output
	}

	fmt.Printf("[DEBUG] Parsing command: %s\n", command)
	fmt.Printf("[DEBUG] Raw output: %s\n", outputStr)

	lines := strings.Split(strings.TrimSpace(outputStr), "\n")
	var items []map[string]interface{}

	if strings.Contains(command, "images") {
		items = s.parseImageOutput(lines)
	} else if strings.Contains(command, "ps") {
		items = s.parseContainerOutput(lines)
	} else if strings.Contains(command, "network") {
		items = s.parseNetworkOutput(lines)
	} else if strings.Contains(command, "volume") {
		items = s.parseVolumeOutput(lines)
	}

	result := map[string]interface{}{
		"items": items,
		"count": len(items),
	}

	fmt.Printf("[DEBUG] Parsed result: %+v\n", result)
	return result
}

func (s *AgentResourceService) parseContainerOutput(lines []string) []map[string]interface{} {
	var items []map[string]interface{}
	fmt.Printf("[DEBUG] Parsing container lines: %+v\n", lines)

	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Fields(line)
		fmt.Printf("[DEBUG] Container fields: %+v\n", fields)

		if len(fields) >= 6 {
			item := map[string]interface{}{
				"id":      fields[0],
				"image":   fields[1],
				"command": fields[2],
				"created": fields[3],
				"status":  fields[4],
				"ports":   fields[5],
			}
			if len(fields) > 6 {
				item["names"] = fields[6]
			}
			items = append(items, item)
			fmt.Printf("[DEBUG] Added container item: %+v\n", item)
		}
	}

	fmt.Printf("[DEBUG] Final container items: %+v\n", items)
	return items
}

func (s *AgentResourceService) parseImageOutput(lines []string) []map[string]interface{} {
	var items []map[string]interface{}
	fmt.Printf("[DEBUG] Parsing image lines: %+v\n", lines)

	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Fields(line)
		fmt.Printf("[DEBUG] Image fields: %+v\n", fields)

		if len(fields) >= 5 {
			item := map[string]interface{}{
				"repository": fields[0],
				"tag":        fields[1],
				"id":         fields[2],
				"created":    strings.Join(fields[3:len(fields)-1], " "),
				"size":       fields[len(fields)-1],
			}
			items = append(items, item)
			fmt.Printf("[DEBUG] Added image item: %+v\n", item)
		}
	}

	fmt.Printf("[DEBUG] Final image items: %+v\n", items)
	return items
}

func (s *AgentResourceService) parseNetworkOutput(lines []string) []map[string]interface{} {
	var items []map[string]interface{}

	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) >= 3 {
			item := map[string]interface{}{
				"id":     fields[0],
				"name":   fields[1],
				"driver": fields[2],
			}
			if len(fields) > 3 {
				item["scope"] = fields[3]
			}
			items = append(items, item)
		}
	}

	return items
}

func (s *AgentResourceService) parseVolumeOutput(lines []string) []map[string]interface{} {
	var items []map[string]interface{}

	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) >= 2 {
			item := map[string]interface{}{
				"driver": fields[0],
				"name":   fields[1],
			}
			items = append(items, item)
		}
	}

	return items
}

func (s *AgentResourceService) storeResourceData(ctx context.Context, agentID, resourceType string, data map[string]interface{}) error {
	var finalData map[string]interface{}

	if items, exists := data["items"]; exists {
		finalData = map[string]interface{}{
			resourceType: items,
			"count":      data["count"],
		}
	} else {
		finalData = map[string]interface{}{
			resourceType: []interface{}{},
			"count":      0,
		}
	}

	fmt.Printf("[DEBUG] Storing %s data for agent %s: %+v\n", resourceType, agentID, finalData)

	resource := &models.AgentResource{
		ID:       fmt.Sprintf("%s:%s", agentID, resourceType),
		AgentID:  agentID,
		Type:     resourceType,
		Data:     models.JSON(finalData),
		LastSync: time.Now(),
	}

	return s.db.WithContext(ctx).Save(resource).Error
}

func (s *AgentResourceService) GetAgentResources(ctx context.Context, agentID, resourceType string) (*models.AgentResource, error) {
	var resource models.AgentResource
	err := s.db.WithContext(ctx).Where("agent_id = ? AND type = ?", agentID, resourceType).First(&resource).Error

	if err != nil {
		return nil, err
	}

	return &resource, nil
}

func (s *AgentResourceService) GetAllAgentResources(ctx context.Context, agentID string) (map[string]*models.AgentResource, error) {
	var resources []models.AgentResource
	err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Find(&resources).Error

	if err != nil {
		return nil, err
	}

	result := make(map[string]*models.AgentResource)
	for i := range resources {
		result[resources[i].Type] = &resources[i]
	}

	return result, nil
}

func (s *AgentResourceService) StartPeriodicSync(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.syncAllOnlineAgents(ctx)
		}
	}
}

func (s *AgentResourceService) syncAllOnlineAgents(ctx context.Context) {
	agents, err := s.agentService.GetOnlineAgents(ctx, 5)
	if err != nil {
		return
	}

	for _, agent := range agents {
		go func(agentID string) {
			if err := s.SyncAgentResources(ctx, agentID); err != nil {
				fmt.Printf("Failed to sync resources for agent %s: %v\n", agentID, err)
			}
		}(agent.ID)
	}
}

func (s *AgentResourceService) SyncAllOnlineAgents(ctx context.Context) error {
	agents, err := s.agentService.GetOnlineAgents(ctx, 5)
	if err != nil {
		return fmt.Errorf("failed to get online agents: %w", err)
	}

	var syncErrors []error
	for _, agent := range agents {
		if err := s.SyncAgentResources(ctx, agent.ID); err != nil {
			syncErrors = append(syncErrors, fmt.Errorf("agent %s: %w", agent.ID, err))
		}
	}

	if len(syncErrors) > 0 {
		return fmt.Errorf("sync failed for %d agents: %v", len(syncErrors), syncErrors)
	}

	return nil
}
