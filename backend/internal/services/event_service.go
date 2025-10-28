package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type EventService struct {
	db *database.DB
}

func NewEventService(db *database.DB) *EventService {
	return &EventService{db: db}
}

type CreateEventRequest struct {
	Type          models.EventType     `json:"type"`
	Severity      models.EventSeverity `json:"severity,omitempty"`
	Title         string               `json:"title"`
	Description   string               `json:"description,omitempty"`
	ResourceType  *string              `json:"resourceType,omitempty"`
	ResourceID    *string              `json:"resourceId,omitempty"`
	ResourceName  *string              `json:"resourceName,omitempty"`
	UserID        *string              `json:"userId,omitempty"`
	Username      *string              `json:"username,omitempty"`
	EnvironmentID *string              `json:"environmentId,omitempty"`
	Metadata      models.JSON          `json:"metadata,omitempty"`
}

func (s *EventService) CreateEvent(ctx context.Context, req CreateEventRequest) (*models.Event, error) {
	severity := req.Severity
	if severity == "" {
		severity = models.EventSeverityInfo
	}

	event := &models.Event{
		Type:          req.Type,
		Severity:      severity,
		Title:         req.Title,
		Description:   req.Description,
		ResourceType:  req.ResourceType,
		ResourceID:    req.ResourceID,
		ResourceName:  req.ResourceName,
		UserID:        req.UserID,
		Username:      req.Username,
		EnvironmentID: req.EnvironmentID,
		Metadata:      req.Metadata,
		Timestamp:     time.Now(),
		BaseModel: models.BaseModel{
			CreatedAt: time.Now(),
		},
	}

	if err := s.db.WithContext(ctx).Create(event).Error; err != nil {
		return nil, fmt.Errorf("failed to create event: %w", err)
	}

	return event, nil
}

func (s *EventService) CreateEventFromDto(ctx context.Context, req dto.CreateEventDto) (*dto.EventDto, error) {
	severity := models.EventSeverity(req.Severity)
	if severity == "" {
		severity = models.EventSeverityInfo
	}

	metadata := models.JSON{}
	if req.Metadata != nil {
		metadata = models.JSON(req.Metadata)
	}

	createReq := CreateEventRequest{
		Type:          models.EventType(req.Type),
		Severity:      severity,
		Title:         req.Title,
		Description:   req.Description,
		ResourceType:  req.ResourceType,
		ResourceID:    req.ResourceID,
		ResourceName:  req.ResourceName,
		UserID:        req.UserID,
		Username:      req.Username,
		EnvironmentID: req.EnvironmentID,
		Metadata:      metadata,
	}

	event, err := s.CreateEvent(ctx, createReq)
	if err != nil {
		return nil, err
	}

	return s.toEventDto(event), nil
}

func (s *EventService) ListEventsPaginated(ctx context.Context, params pagination.QueryParams) ([]dto.EventDto, pagination.Response, error) {
	var events []models.Event
	q := s.db.WithContext(ctx).Model(&models.Event{})

	if term := strings.TrimSpace(params.Search); term != "" {
		searchPattern := "%" + term + "%"
		q = q.Where(
			"title LIKE ? OR description LIKE ? OR COALESCE(resource_name, '') LIKE ? OR COALESCE(username, '') LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	if severity := params.Filters["severity"]; severity != "" {
		q = q.Where("severity = ?", severity)
	}
	if eventType := params.Filters["type"]; eventType != "" {
		q = q.Where("type = ?", eventType)
	}
	if resourceType := params.Filters["resourceType"]; resourceType != "" {
		q = q.Where("resource_type = ?", resourceType)
	}
	if username := params.Filters["username"]; username != "" {
		q = q.Where("username = ?", username)
	}
	if environmentId := params.Filters["environmentId"]; environmentId != "" {
		q = q.Where("environment_id = ?", environmentId)
	}

	paginationResp, err := pagination.PaginateAndSortDB(params, q, &events)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to paginate events: %w", err)
	}

	eventDtos, mapErr := dto.MapSlice[models.Event, dto.EventDto](events)
	if mapErr != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to map events: %w", mapErr)
	}

	return eventDtos, paginationResp, nil
}

func (s *EventService) GetEventsByEnvironmentPaginated(ctx context.Context, environmentID string, params pagination.QueryParams) ([]dto.EventDto, pagination.Response, error) {
	var events []models.Event
	q := s.db.WithContext(ctx).Model(&models.Event{}).Where("environment_id = ?", environmentID)

	if term := strings.TrimSpace(params.Search); term != "" {
		searchPattern := "%" + term + "%"
		q = q.Where(
			"title LIKE ? OR description LIKE ? OR COALESCE(resource_name, '') LIKE ? OR COALESCE(username, '') LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	if severity := params.Filters["severity"]; severity != "" {
		q = q.Where("severity = ?", severity)
	}
	if eventType := params.Filters["type"]; eventType != "" {
		q = q.Where("type = ?", eventType)
	}
	if resourceType := params.Filters["resourceType"]; resourceType != "" {
		q = q.Where("resource_type = ?", resourceType)
	}
	if username := params.Filters["username"]; username != "" {
		q = q.Where("username = ?", username)
	}

	paginationResp, err := pagination.PaginateAndSortDB(params, q, &events)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to paginate events: %w", err)
	}

	eventDtos, mapErr := dto.MapSlice[models.Event, dto.EventDto](events)
	if mapErr != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to map events: %w", mapErr)
	}

	return eventDtos, paginationResp, nil
}

func (s *EventService) DeleteEvent(ctx context.Context, eventID string) error {
	result := s.db.WithContext(ctx).Delete(&models.Event{}, "id = ?", eventID)
	if result.Error != nil {
		return fmt.Errorf("failed to delete event: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("event not found")
	}
	return nil
}

func (s *EventService) DeleteOldEvents(ctx context.Context, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	result := s.db.WithContext(ctx).Where("timestamp < ?", cutoff).Delete(&models.Event{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete old events: %w", result.Error)
	}
	return nil
}

func (s *EventService) LogContainerEvent(ctx context.Context, eventType models.EventType, containerID, containerName, userID, username, environmentID string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, containerName)
	description := s.generateEventDescription(eventType, "container", containerName)
	severity := s.getEventSeverity(eventType)

	resourceType := "container"
	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:          eventType,
		Severity:      severity,
		Title:         title,
		Description:   description,
		ResourceType:  &resourceType,
		ResourceID:    &containerID,
		ResourceName:  &containerName,
		UserID:        &userID,
		Username:      &username,
		EnvironmentID: &environmentID,
		Metadata:      metadata,
	})
	return err
}

func (s *EventService) LogImageEvent(ctx context.Context, eventType models.EventType, imageID, imageName, userID, username, environmentID string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, imageName)
	description := s.generateEventDescription(eventType, "image", imageName)
	severity := s.getEventSeverity(eventType)

	resourceType := "image"
	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:          eventType,
		Severity:      severity,
		Title:         title,
		Description:   description,
		ResourceType:  &resourceType,
		ResourceID:    &imageID,
		ResourceName:  &imageName,
		UserID:        &userID,
		Username:      &username,
		EnvironmentID: &environmentID,
		Metadata:      metadata,
	})
	return err
}

func (s *EventService) LogProjectEvent(ctx context.Context, eventType models.EventType, projectID, projectName, userID, username, environmentID string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, projectName)
	description := s.generateEventDescription(eventType, "project", projectName)
	severity := s.getEventSeverity(eventType)

	resourceType := "project"
	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:          eventType,
		Severity:      severity,
		Title:         title,
		Description:   description,
		ResourceType:  &resourceType,
		ResourceID:    &projectID,
		ResourceName:  &projectName,
		UserID:        &userID,
		Username:      &username,
		EnvironmentID: &environmentID,
		Metadata:      metadata,
	})
	return err
}

func (s *EventService) LogUserEvent(ctx context.Context, eventType models.EventType, userID, username string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, username)
	description := s.generateEventDescription(eventType, "user", username)
	severity := s.getEventSeverity(eventType)

	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:        eventType,
		Severity:    severity,
		Title:       title,
		Description: description,
		UserID:      &userID,
		Username:    &username,
		Metadata:    metadata,
	})
	return err
}

func (s *EventService) LogVolumeEvent(ctx context.Context, eventType models.EventType, volumeID, volumeName, userID, username, environmentID string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, volumeName)
	description := s.generateEventDescription(eventType, "volume", volumeName)
	severity := s.getEventSeverity(eventType)

	resourceType := "volume"
	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:          eventType,
		Severity:      severity,
		Title:         title,
		Description:   description,
		ResourceType:  &resourceType,
		ResourceID:    &volumeID,
		ResourceName:  &volumeName,
		UserID:        &userID,
		Username:      &username,
		EnvironmentID: &environmentID,
		Metadata:      metadata,
	})
	return err
}

func (s *EventService) LogNetworkEvent(ctx context.Context, eventType models.EventType, networkID, networkName, userID, username, environmentID string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, networkName)
	description := s.generateEventDescription(eventType, "network", networkName)
	severity := s.getEventSeverity(eventType)

	resourceType := "network"
	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:          eventType,
		Severity:      severity,
		Title:         title,
		Description:   description,
		ResourceType:  &resourceType,
		ResourceID:    &networkID,
		ResourceName:  &networkName,
		UserID:        &userID,
		Username:      &username,
		EnvironmentID: &environmentID,
		Metadata:      metadata,
	})
	return err
}

func (s *EventService) toEventDto(event *models.Event) *dto.EventDto {
	var metadata map[string]interface{}
	if event.Metadata != nil {
		metadata = map[string]interface{}(event.Metadata)
	}

	return &dto.EventDto{
		ID:            event.ID,
		Type:          string(event.Type),
		Severity:      string(event.Severity),
		Title:         event.Title,
		Description:   event.Description,
		ResourceType:  event.ResourceType,
		ResourceID:    event.ResourceID,
		ResourceName:  event.ResourceName,
		UserID:        event.UserID,
		Username:      event.Username,
		EnvironmentID: event.EnvironmentID,
		Metadata:      metadata,
		Timestamp:     event.Timestamp,
		CreatedAt:     event.CreatedAt,
		UpdatedAt:     event.UpdatedAt,
	}
}

func (s *EventService) generateEventTitle(eventType models.EventType, resourceName string) string {
	switch eventType {
	case models.EventTypeContainerStart:
		return fmt.Sprintf("Container started: %s", resourceName)
	case models.EventTypeContainerStop:
		return fmt.Sprintf("Container stopped: %s", resourceName)
	case models.EventTypeContainerRestart:
		return fmt.Sprintf("Container restarted: %s", resourceName)
	case models.EventTypeContainerDelete:
		return fmt.Sprintf("Container deleted: %s", resourceName)
	case models.EventTypeContainerCreate:
		return fmt.Sprintf("Container created: %s", resourceName)
	case models.EventTypeContainerScan:
		return fmt.Sprintf("Container scanned: %s", resourceName)
	case models.EventTypeContainerUpdate:
		return fmt.Sprintf("Container updated: %s", resourceName)
	case models.EventTypeImagePull:
		return fmt.Sprintf("Image pulled: %s", resourceName)
	case models.EventTypeImageDelete:
		return fmt.Sprintf("Image deleted: %s", resourceName)
	case models.EventTypeImageScan:
		return fmt.Sprintf("Image scanned: %s", resourceName)
	case models.EventTypeProjectDeploy:
		return fmt.Sprintf("Project deployed: %s", resourceName)
	case models.EventTypeProjectDelete:
		return fmt.Sprintf("Project deleted: %s", resourceName)
	case models.EventTypeProjectStart:
		return fmt.Sprintf("Project started: %s", resourceName)
	case models.EventTypeProjectStop:
		return fmt.Sprintf("Project stopped: %s", resourceName)
	case models.EventTypeProjectCreate:
		return fmt.Sprintf("Project created: %s", resourceName)
	case models.EventTypeProjectUpdate:
		return fmt.Sprintf("Project updated: %s", resourceName)
	case models.EventTypeVolumeCreate:
		return fmt.Sprintf("Volume created: %s", resourceName)
	case models.EventTypeVolumeDelete:
		return fmt.Sprintf("Volume deleted: %s", resourceName)
	case models.EventTypeNetworkCreate:
		return fmt.Sprintf("Network created: %s", resourceName)
	case models.EventTypeNetworkDelete:
		return fmt.Sprintf("Network deleted: %s", resourceName)
	case models.EventTypeSystemPrune:
		return "System prune completed"
	case models.EventTypeSystemAutoUpdate:
		return "System auto-update completed"
	case models.EventTypeSystemUpgrade:
		return "System upgrade completed"
	case models.EventTypeUserLogin:
		return fmt.Sprintf("User logged in: %s", resourceName)
	case models.EventTypeUserLogout:
		return fmt.Sprintf("User logged out: %s", resourceName)
	default:
		return fmt.Sprintf("Event: %s", string(eventType))
	}
}

func (s *EventService) generateEventDescription(eventType models.EventType, resourceType, resourceName string) string {
	switch eventType {
	case models.EventTypeContainerScan, models.EventTypeImageScan:
		return fmt.Sprintf("Security scan completed for %s '%s'", resourceType, resourceName)
	case models.EventTypeContainerStart:
		return fmt.Sprintf("Container '%s' has been started", resourceName)
	case models.EventTypeContainerStop:
		return fmt.Sprintf("Container '%s' has been stopped", resourceName)
	case models.EventTypeContainerRestart:
		return fmt.Sprintf("Container '%s' has been restarted", resourceName)
	case models.EventTypeContainerDelete:
		return fmt.Sprintf("Container '%s' has been deleted", resourceName)
	case models.EventTypeContainerCreate:
		return fmt.Sprintf("Container '%s' has been created", resourceName)
	case models.EventTypeContainerUpdate:
		return fmt.Sprintf("Container '%s' has been updated", resourceName)
	case models.EventTypeImagePull:
		return fmt.Sprintf("Image '%s' has been pulled", resourceName)
	case models.EventTypeImageDelete:
		return fmt.Sprintf("Image '%s' has been deleted", resourceName)
	case models.EventTypeProjectDeploy:
		return fmt.Sprintf("Project '%s' has been deployed", resourceName)
	case models.EventTypeProjectDelete:
		return fmt.Sprintf("Project '%s' has been deleted", resourceName)
	case models.EventTypeProjectStart:
		return fmt.Sprintf("Project '%s' has been started", resourceName)
	case models.EventTypeProjectStop:
		return fmt.Sprintf("Project '%s' has been stopped", resourceName)
	case models.EventTypeProjectCreate:
		return fmt.Sprintf("Project '%s' has been created", resourceName)
	case models.EventTypeProjectUpdate:
		return fmt.Sprintf("Project '%s' has been updated", resourceName)
	case models.EventTypeVolumeCreate:
		return fmt.Sprintf("Volume '%s' has been created", resourceName)
	case models.EventTypeVolumeDelete:
		return fmt.Sprintf("Volume '%s' has been deleted", resourceName)
	case models.EventTypeNetworkCreate:
		return fmt.Sprintf("Network '%s' has been created", resourceName)
	case models.EventTypeNetworkDelete:
		return fmt.Sprintf("Network '%s' has been deleted", resourceName)
	case models.EventTypeSystemPrune:
		return "System resources have been pruned"
	case models.EventTypeSystemAutoUpdate:
		return "System auto-update process has completed"
	case models.EventTypeSystemUpgrade:
		return "System upgrade process has completed"
	case models.EventTypeUserLogin:
		return fmt.Sprintf("User '%s' has logged in", resourceName)
	case models.EventTypeUserLogout:
		return fmt.Sprintf("User '%s' has logged out", resourceName)
	default:
		return fmt.Sprintf("%s operation performed on %s '%s'", string(eventType), resourceType, resourceName)
	}
}

func (s *EventService) getEventSeverity(eventType models.EventType) models.EventSeverity {
	switch eventType {
	case models.EventTypeContainerDelete, models.EventTypeImageDelete, models.EventTypeProjectDelete, models.EventTypeVolumeDelete, models.EventTypeNetworkDelete:
		return models.EventSeverityWarning
	case models.EventTypeContainerStart, models.EventTypeContainerCreate, models.EventTypeImagePull, models.EventTypeProjectDeploy, models.EventTypeProjectStart, models.EventTypeProjectCreate, models.EventTypeVolumeCreate, models.EventTypeNetworkCreate:
		return models.EventSeveritySuccess
	case models.EventTypeContainerStop, models.EventTypeContainerRestart, models.EventTypeContainerScan, models.EventTypeContainerUpdate, models.EventTypeImageScan, models.EventTypeProjectStop, models.EventTypeProjectUpdate, models.EventTypeSystemPrune, models.EventTypeSystemAutoUpdate, models.EventTypeSystemUpgrade, models.EventTypeUserLogin, models.EventTypeUserLogout:
		return models.EventSeverityInfo
	default:
		return models.EventSeverityInfo
	}
}
