package api

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type VersionHandler struct {
	version *services.VersionService
}

func NewVersionHandler(api *gin.RouterGroup, version *services.VersionService) *VersionHandler {
	h := &VersionHandler{version: version}
	api.GET("/version", h.Get)
	return h
}

func (h *VersionHandler) Get(c *gin.Context) {
	current := strings.TrimSpace(c.Query("current"))

	info, err := h.version.GetVersionInformation(c.Request.Context(), current)
	if err != nil {
		slog.Warn("version information fetch error", "error", err)
	}
	c.JSON(http.StatusOK, info)
}
