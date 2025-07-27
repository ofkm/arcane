//go:build playwright

package bootstrap

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/api"
	"github.com/ofkm/arcane-backend/internal/services"
)

// When building for E2E tests, add the playwright controller
func init() {
	registerPlaywrightRoutes = []func(apiGroup *gin.RouterGroup, services *api.Services){
		func(apiGroup *gin.RouterGroup, svc *api.Services) {
			playwrightService := services.NewPlaywrightService(svc.Settings)
			if playwrightService == nil {
				log.Println("Playwright service not available, skipping playwright routes")
				return
			}

			api.SetupPlaywrightRoutes(apiGroup, playwrightService)
			log.Println("Playwright routes registered for E2E testing")
		},
	}
}
