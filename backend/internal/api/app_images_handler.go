package api

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
	apphttp "github.com/ofkm/arcane-backend/internal/utils/http"
)

type ApplicationImagesHandler struct {
	appImagesService *services.ApplicationImagesService
}

func NewApplicationImagesHandler(group *gin.RouterGroup, appImagesService *services.ApplicationImagesService) {
	appImageHandler := &ApplicationImagesHandler{appImagesService: appImagesService}

	group.GET("/app-images/logo", appImageHandler.getLogo)
	group.GET("/app-images/favicon", appImageHandler.getFavicon)
}

func (c *ApplicationImagesHandler) getLogo(ctx *gin.Context) {
	c.getImage(ctx, "logo")
}

func (c *ApplicationImagesHandler) getFavicon(ctx *gin.Context) {
	c.getImage(ctx, "favicon")
}

func (c *ApplicationImagesHandler) getImage(ctx *gin.Context, name string) {
	imageData, mimeType, err := c.appImagesService.GetImage(name)
	if err != nil {
		_ = ctx.Error(err)
		return
	}

	ctx.Header("Content-Type", mimeType)
	apphttp.SetCacheControlHeader(ctx, 15*time.Minute, 24*time.Hour)
	ctx.Data(200, mimeType, imageData)
}
