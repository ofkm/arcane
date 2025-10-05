package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
)

type ImageUpdateHandler struct {
	imageUpdateService *services.ImageUpdateService
}

func NewImageUpdateHandler(group *gin.RouterGroup, imageUpdateService *services.ImageUpdateService, authMiddleware *middleware.AuthMiddleware) {
	handler := &ImageUpdateHandler{imageUpdateService: imageUpdateService}

	apiGroup := group.Group("/environments/:id/image-updates")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/check", handler.CheckImageUpdate)
		apiGroup.GET("/check/:imageId", handler.CheckImageUpdateByID)
		apiGroup.POST("/check-batch", handler.CheckMultipleImages)
		apiGroup.GET("/check-all", handler.CheckAllImages)
		apiGroup.GET("/summary", handler.GetUpdateSummary)
	}
}

func (h *ImageUpdateHandler) CheckImageUpdate(c *gin.Context) {
	imageRef := c.Query("imageRef")
	if imageRef == "" {
		httputil.RespondBadRequest(c, "imageRef query parameter is required")
		return
	}

	result, err := h.imageUpdateService.CheckImageUpdate(c.Request.Context(), imageRef)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, result)
}

func (h *ImageUpdateHandler) CheckImageUpdateByID(c *gin.Context) {
	imageID := c.Param("imageId")
	if imageID == "" {
		httputil.RespondBadRequest(c, "imageId parameter is required")
		return
	}

	result, err := h.imageUpdateService.CheckImageUpdateByID(c.Request.Context(), imageID)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, result)
}

func (h *ImageUpdateHandler) CheckMultipleImages(c *gin.Context) {
	var req dto.BatchImageUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format")
		return
	}

	if len(req.ImageRefs) == 0 {
		httputil.RespondBadRequest(c, "At least one imageRef is required")
		return
	}

	results, err := h.imageUpdateService.CheckMultipleImages(c.Request.Context(), req.ImageRefs, req.Credentials)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	response := dto.BatchImageUpdateResponse(results)

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *ImageUpdateHandler) CheckAllImages(c *gin.Context) {
	var req dto.BatchImageUpdateRequest
	_ = c.ShouldBindJSON(&req)

	results, err := h.imageUpdateService.CheckAllImages(c.Request.Context(), 0, req.Credentials)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	response := dto.BatchImageUpdateResponse(results)

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *ImageUpdateHandler) GetUpdateSummary(c *gin.Context) {
	summary, err := h.imageUpdateService.GetUpdateSummary(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, summary)
}
