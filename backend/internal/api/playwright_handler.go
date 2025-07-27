//go:build playwright

package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type PlaywrightHandler struct {
	PlaywrightService *services.PlaywrightService
}

func NewPlaywrightHandler(playwrightService *services.PlaywrightService) *PlaywrightHandler {
	return &PlaywrightHandler{PlaywrightService: playwrightService}
}

func SetupPlaywrightRoutes(api *gin.RouterGroup, playwrightService *services.PlaywrightService) {
	playwright := api.Group("/playwright")

	playwrightHandler := NewPlaywrightHandler(playwrightService)

	playwright.POST("/skip-onboarding", playwrightHandler.SkipOnboardingHandler)
	playwright.POST("/reset-onboarding", playwrightHandler.ResetOnboardingHandler)
}

func (ph *PlaywrightHandler) SkipOnboardingHandler(c *gin.Context) {
	if err := ph.PlaywrightService.SkipOnboarding(c.Request.Context()); err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

func (ph *PlaywrightHandler) ResetOnboardingHandler(c *gin.Context) {
	if err := ph.PlaywrightService.ResetOnboarding(c.Request.Context()); err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}
