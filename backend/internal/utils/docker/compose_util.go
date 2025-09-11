package docker

import (
	"os"
	"path/filepath"
)

var ComposeFileCandidates = []string{
	"compose.yaml",
	"compose.yml",
	"docker-compose.yaml",
	"docker-compose.yml",
}

func LocateComposeFile(stackDir string) string {
	for _, filename := range ComposeFileCandidates {
		fullPath := filepath.Join(stackDir, filename)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			return fullPath
		}
	}
	return ""
}
