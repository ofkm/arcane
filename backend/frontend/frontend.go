package frontend

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

//go:embed all:dist/*
var frontendFS embed.FS

func RegisterFrontend(router *gin.Engine) error {
	distFS, err := fs.Sub(frontendFS, "dist")
	if err != nil {
		return fmt.Errorf("failed to create sub FS: %w", err)
	}

	cacheMaxAge := time.Hour * 24
	fileServer := NewFileServerWithCaching(http.FS(distFS), int(cacheMaxAge.Seconds()))

	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		if strings.HasPrefix(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   fmt.Sprintf("API endpoint not found: %s", path),
			})
			return
		}

		if path == "/health" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Health endpoint not found",
			})
			return
		}

		requestedPath := strings.TrimPrefix(path, "/")
		if requestedPath == "" {
			requestedPath = "index.html"
		}

		if _, err := fs.Stat(distFS, requestedPath); os.IsNotExist(err) {
			c.Request.URL.Path = "/"
			requestedPath = "index.html"
		}

		fileServer.ServeHTTP(c.Writer, c.Request)
	})

	return nil
}

type FileServerWithCaching struct {
	root                    http.FileSystem
	lastModified            time.Time
	cacheMaxAge             int
	lastModifiedHeaderValue string
	cacheControlHeaderValue string
}

func NewFileServerWithCaching(root http.FileSystem, maxAge int) *FileServerWithCaching {
	return &FileServerWithCaching{
		root:                    root,
		lastModified:            time.Now(),
		cacheMaxAge:             maxAge,
		lastModifiedHeaderValue: time.Now().UTC().Format(http.TimeFormat),
		cacheControlHeaderValue: fmt.Sprintf("public, max-age=%d", maxAge),
	}
}

func (f *FileServerWithCaching) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if ifModifiedSince := r.Header.Get("If-Modified-Since"); ifModifiedSince != "" {
		ifModifiedSinceTime, err := time.Parse(http.TimeFormat, ifModifiedSince)
		if err == nil && f.lastModified.Before(ifModifiedSinceTime.Add(1*time.Second)) {
			w.WriteHeader(http.StatusNotModified)
			return
		}
	}

	w.Header().Set("Last-Modified", f.lastModifiedHeaderValue)
	w.Header().Set("Cache-Control", f.cacheControlHeaderValue)

	http.FileServer(f.root).ServeHTTP(w, r)
}
