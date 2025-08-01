package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type EventHandler struct {
	eventService *services.EventService
}

func NewEventHandler(eventService *services.EventService) *EventHandler {
	return &EventHandler{
		eventService: eventService,
	}
}

func (h *EventHandler) ListEvents(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pagination or sort parameters: " + err.Error(),
		})
		return
	}

	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	events, pagination, err := h.eventService.ListEventsPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list events: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       events,
		"pagination": pagination,
	})
}

func (h *EventHandler) GetEventsByEnvironment(c *gin.Context) {
	environmentID := c.Param("environmentId")
	if environmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Environment ID is required",
		})
		return
	}

	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pagination or sort parameters: " + err.Error(),
		})
		return
	}

	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	events, pagination, err := h.eventService.GetEventsByEnvironmentPaginated(c.Request.Context(), environmentID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list events: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       events,
		"pagination": pagination,
	})
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	var req dto.CreateEventDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	event, err := h.eventService.CreateEventFromDto(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create event: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    event,
	})
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	eventID := c.Param("eventId")
	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Event ID is required",
		})
		return
	}

	if err := h.eventService.DeleteEvent(c.Request.Context(), eventID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete event: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Event deleted successfully",
	})
}
