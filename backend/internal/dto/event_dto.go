package dto

import "time"

type EventDto struct {
	ID            string                 `json:"id"`
	Type          string                 `json:"type"`
	Severity      string                 `json:"severity"`
	Title         string                 `json:"title"`
	Description   string                 `json:"description,omitempty"`
	ResourceType  *string                `json:"resourceType,omitempty"`
	ResourceID    *string                `json:"resourceId,omitempty"`
	ResourceName  *string                `json:"resourceName,omitempty"`
	UserID        *string                `json:"userId,omitempty"`
	Username      *string                `json:"username,omitempty"`
	EnvironmentID *string                `json:"environmentId,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     *time.Time             `json:"updatedAt,omitempty"`
}

type CreateEventDto struct {
	Type          string                 `json:"type" binding:"required"`
	Severity      string                 `json:"severity,omitempty"`
	Title         string                 `json:"title" binding:"required"`
	Description   string                 `json:"description,omitempty"`
	ResourceType  *string                `json:"resourceType,omitempty"`
	ResourceID    *string                `json:"resourceId,omitempty"`
	ResourceName  *string                `json:"resourceName,omitempty"`
	UserID        *string                `json:"userId,omitempty"`
	Username      *string                `json:"username,omitempty"`
	EnvironmentID *string                `json:"environmentId,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

type EventListDto struct {
	Events      []EventDto `json:"events"`
	Total       int        `json:"total"`
	Page        int        `json:"page"`
	PageSize    int        `json:"pageSize"`
	TotalPages  int        `json:"totalPages"`
	HasNext     bool       `json:"hasNext"`
	HasPrevious bool       `json:"hasPrevious"`
}
