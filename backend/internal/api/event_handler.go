package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type EventHandler struct {
	eventService *services.EventService
}

func NewEventHandler(group *gin.RouterGroup, eventService *services.EventService, authMiddleware *middleware.AuthMiddleware) {
	handler := &EventHandler{eventService: eventService}

	apiGroup := group.Group("/events")
	apiGroup.Use(authMiddleware.WithAdminRequired().Add())
	{
		apiGroup.GET("", handler.ListEvents)
		apiGroup.POST("", handler.CreateEvent)
		apiGroup.DELETE("/:eventId", handler.DeleteEvent)
		apiGroup.GET("/environment/:environmentId", handler.GetEventsByEnvironment)
	}
}

func (h *EventHandler) ListEvents(c *gin.Context) {
	params := pagination.ExtractListModifiersQueryParams(c)

	events, paginationResp, err := h.eventService.ListEventsPaginated(c.Request.Context(), params)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	response := gin.H{
		"items":      events,
		"pagination": paginationResp,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *EventHandler) GetEventsByEnvironment(c *gin.Context) {
	environmentID := c.Param("environmentId")
	if environmentID == "" {
		httputil.RespondBadRequest(c, "Environment ID is required")
		return
	}

	params := pagination.ExtractListModifiersQueryParams(c)

	events, paginationResp, err := h.eventService.GetEventsByEnvironmentPaginated(c.Request.Context(), environmentID, params)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	response := gin.H{
		"items":      events,
		"pagination": paginationResp,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	var req dto.CreateEventDto
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	event, err := h.eventService.CreateEventFromDto(c.Request.Context(), req)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusCreated, event)
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	eventID := c.Param("eventId")
	if eventID == "" {
		httputil.RespondBadRequest(c, "Event ID is required")
		return
	}

	if err := h.eventService.DeleteEvent(c.Request.Context(), eventID); err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Event deleted successfully")
}
