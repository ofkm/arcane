package api

import (
	"net/http"
	"strconv"
	"time"

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
			"data":    gin.H{"error": "Invalid pagination or sort parameters: " + err.Error()},
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
			"data":    gin.H{"error": "Failed to list events: " + err.Error()},
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
			"data":    gin.H{"error": "Environment ID is required"},
		})
		return
	}

	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid pagination or sort parameters: " + err.Error()},
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
			"data":    gin.H{"error": "Failed to list events: " + err.Error()},
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
			"data":    gin.H{"error": "Invalid request body: " + err.Error()},
		})
		return
	}

	event, err := h.eventService.CreateEventFromDto(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to create event: " + err.Error()},
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
			"data":    gin.H{"error": "Event ID is required"},
		})
		return
	}

	if err := h.eventService.DeleteEvent(c.Request.Context(), eventID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to delete event: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Event deleted successfully"},
	})
}

func (h *EventHandler) DeleteOldEvents(c *gin.Context) {
	daysStr := c.Query("days")
	if daysStr == "" {
		daysStr = c.Query("olderThanDays")
	}

	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"data":    gin.H{"error": "Invalid or missing 'days' parameter"},
		})
		return
	}

	duration := time.Duration(days) * 24 * time.Hour
	if err := h.eventService.DeleteOldEvents(c.Request.Context(), duration); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to delete old events: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Old events deleted successfully"},
	})
}
