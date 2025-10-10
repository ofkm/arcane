package http

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func SetCacheControlHeader(ctx *gin.Context, maxAge, staleWhileRevalidate time.Duration) {
	_, ok := ctx.GetQuery("skip-cache")
	if !ok {
		maxAgeSeconds := strconv.Itoa(int(maxAge.Seconds()))
		staleWhileRevalidateSeconds := strconv.Itoa(int(staleWhileRevalidate.Seconds()))
		ctx.Header("Cache-Control", "public, max-age="+maxAgeSeconds+", stale-while-revalidate="+staleWhileRevalidateSeconds)
	}

}
