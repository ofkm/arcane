package http

import (
	nethttp "net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	dockerutil "github.com/ofkm/arcane-backend/internal/utils/docker"
)

func RespondWithSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, dto.NewSuccessResponse(data))
}

func RespondWithMessage(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, dto.NewMessageResponse(message))
}

func RespondWithError(c *gin.Context, err error) {
	dockerErr := dockerutil.ExtractDockerError(err)
	apiErr := models.ToAPIError(dockerErr)

	c.JSON(apiErr.HTTPStatus(), dto.NewErrorResponseWithCode(apiErr.Message, string(apiErr.Code)))
}

func RespondWithErrorDetails(c *gin.Context, err error, details interface{}) {
	dockerErr := dockerutil.ExtractDockerError(err)
	apiErr := models.ToAPIError(dockerErr)

	c.JSON(apiErr.HTTPStatus(), dto.NewErrorResponseWithDetails(apiErr.Message, string(apiErr.Code), details))
}

func RespondWithCustomError(c *gin.Context, statusCode int, message string, code string) {
	c.JSON(statusCode, dto.NewErrorResponseWithCode(message, code))
}

func RespondBadRequest(c *gin.Context, message string) {
	RespondWithCustomError(c, nethttp.StatusBadRequest, message, string(models.APIErrorCodeBadRequest))
}

func RespondNotFound(c *gin.Context, message string) {
	RespondWithCustomError(c, nethttp.StatusNotFound, message, string(models.APIErrorCodeNotFound))
}
