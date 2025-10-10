package services

import (
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"

	"github.com/ofkm/arcane-backend/internal/utils/image"
)

type ApplicationImagesService struct {
	mu        sync.RWMutex
	imageData map[string][]byte
	mimeTypes map[string]string
}

func NewApplicationImagesService(embeddedFS embed.FS) *ApplicationImagesService {
	service := &ApplicationImagesService{
		imageData: make(map[string][]byte),
		mimeTypes: make(map[string]string),
	}

	imageDir := "images"
	entries, err := fs.ReadDir(embeddedFS, imageDir)
	if err != nil {
		return service
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filename := entry.Name()
		ext := strings.ToLower(filepath.Ext(filename))
		nameWithoutExt := strings.TrimSuffix(filename, ext)

		data, err := embeddedFS.ReadFile(filepath.Join(imageDir, filename))
		if err != nil {
			continue
		}

		extWithoutDot := strings.TrimPrefix(ext, ".")
		mimeType := image.GetImageMimeType(extWithoutDot)
		if mimeType == "" {
			continue
		}

		service.imageData[nameWithoutExt] = data
		service.mimeTypes[nameWithoutExt] = mimeType
	}

	return service
}

func (s *ApplicationImagesService) GetImage(name string) ([]byte, string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, ok := s.imageData[name]
	if !ok {
		return nil, "", fmt.Errorf("image '%s' not found", name)
	}

	mimeType := s.mimeTypes[name]
	return data, mimeType, nil
}
