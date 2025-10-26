//go:build exclude_frontend

package frontend

import "github.com/gin-gonic/gin"

func RegisterFrontend(router *gin.Engine, basePath string) error {
	return ErrFrontendNotIncluded
}
