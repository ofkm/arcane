package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"gorm.io/gorm"
)

type EventService struct {
	db *gorm.DB
}

func NewEventService(db *gorm.DB) *EventService {
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
		ID:            uuid.New().String(),
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

func (s *EventService) ListEventsPaginated(ctx context.Context, req utils.SortedPaginationRequest) ([]dto.EventDto, utils.PaginationResponse, error) {
	var events []models.Event

	query := s.db.WithContext(ctx).Model(&models.Event{})

	if req.Search != "" {
		searchQuery := "%" + req.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ? OR resource_name ILIKE ? OR username ILIKE ?",
			searchQuery, searchQuery, searchQuery, searchQuery)
	}

	pagination, err := utils.PaginateAndSort(req, query, &events)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate events: %w", err)
	}

	eventDtos := make([]dto.EventDto, len(events))
	for i, event := range events {
		eventDtos[i] = *s.toEventDto(&event)
	}

	return eventDtos, pagination, nil
}

func (s *EventService) GetEventsByEnvironmentPaginated(ctx context.Context, environmentID string, req utils.SortedPaginationRequest) ([]dto.EventDto, utils.PaginationResponse, error) {
	var events []models.Event

	query := s.db.WithContext(ctx).Model(&models.Event{}).Where("environment_id = ?", environmentID)

	if req.Search != "" {
		searchQuery := "%" + req.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ? OR resource_name ILIKE ? OR username ILIKE ?",
			searchQuery, searchQuery, searchQuery, searchQuery)
	}

	pagination, err := utils.PaginateAndSort(req, query, &events)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate events: %w", err)
	}

	eventDtos := make([]dto.EventDto, len(events))
	for i, event := range events {
		eventDtos[i] = *s.toEventDto(&event)
	}

	return eventDtos, pagination, nil
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

func (s *EventService) LogStackEvent(ctx context.Context, eventType models.EventType, stackID, stackName, userID, username, environmentID string, metadata models.JSON) error {
	title := s.generateEventTitle(eventType, stackName)
	description := s.generateEventDescription(eventType, "stack", stackName)
	severity := s.getEventSeverity(eventType)

	resourceType := "stack"
	_, err := s.CreateEvent(ctx, CreateEventRequest{
		Type:          eventType,
		Severity:      severity,
		Title:         title,
		Description:   description,
		ResourceType:  &resourceType,
		ResourceID:    &stackID,
		ResourceName:  &stackName,
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
	case models.EventTypeImagePull:
		return fmt.Sprintf("Image pulled: %s", resourceName)
	case models.EventTypeImageDelete:
		return fmt.Sprintf("Image deleted: %s", resourceName)
	case models.EventTypeImageScan:
		return fmt.Sprintf("Image scanned: %s", resourceName)
	case models.EventTypeStackDeploy:
		return fmt.Sprintf("Stack deployed: %s", resourceName)
	case models.EventTypeStackDelete:
		return fmt.Sprintf("Stack deleted: %s", resourceName)
	case models.EventTypeStackStart:
		return fmt.Sprintf("Stack started: %s", resourceName)
	case models.EventTypeStackStop:
		return fmt.Sprintf("Stack stopped: %s", resourceName)
	case models.EventTypeUserLogin:
		return fmt.Sprintf("User logged in: %s", resourceName)
	case models.EventTypeUserLogout:
		return fmt.Sprintf("User logged out: %s", resourceName)
	case models.EventTypeSystemPrune:
		return "System prune completed"
	default:
		return fmt.Sprintf("Event: %s", string(eventType))
	}
}

func (s *EventService) generateEventDescription(eventType models.EventType, resourceType, resourceName string) string {
	switch eventType {
	case models.EventTypeContainerScan, models.EventTypeImageScan:
		return fmt.Sprintf("Security scan completed for %s '%s'", resourceType, resourceName)
	default:
		return fmt.Sprintf("%s operation performed on %s '%s'", string(eventType), resourceType, resourceName)
	}
}

func (s *EventService) getEventSeverity(eventType models.EventType) models.EventSeverity {
	switch eventType {
	case models.EventTypeContainerDelete, models.EventTypeImageDelete, models.EventTypeStackDelete:
		return models.EventSeverityWarning
	case models.EventTypeContainerStart, models.EventTypeContainerCreate, models.EventTypeImagePull, models.EventTypeStackDeploy:
		return models.EventSeveritySuccess
	case models.EventTypeUserLogin, models.EventTypeUserLogout:
		return models.EventSeverityInfo
	default:
		return models.EventSeverityInfo
	}
}
