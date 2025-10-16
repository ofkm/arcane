package fs

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/ofkm/arcane-backend/internal/utils/projects"
)

func CountSubdirectories(path string) (int, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return 0, fmt.Errorf("failed to read directory: %w", err)
	}

	count := 0
	for _, entry := range entries {
		if entry.IsDir() {
			count++
		}
	}
	return count, nil
}

func GetProjectsDirectory(ctx context.Context, projectsDir string) (string, error) {
	projectsDirectory := projectsDir
	if projectsDirectory == "" {
		projectsDirectory = "data/projects"
	}

	if _, err := os.Stat(projectsDirectory); os.IsNotExist(err) {
		if err := os.MkdirAll(projectsDirectory, 0755); err != nil {
			return "", err
		}
		slog.InfoContext(ctx, "Created projects directory", "path", projectsDirectory)
	}

	return projectsDirectory, nil
}

func ReadProjectFiles(projectPath string) (composeContent, envContent string, err error) {
	if composeFile, derr := projects.DetectComposeFile(projectPath); derr == nil && composeFile != "" {
		if content, rerr := os.ReadFile(composeFile); rerr == nil {
			composeContent = string(content)
		}
	}

	envPath := filepath.Join(projectPath, ".env")
	if content, rerr := os.ReadFile(envPath); rerr == nil {
		envContent = string(content)
	}

	return composeContent, envContent, nil
}

func GetTemplatesDirectory(ctx context.Context) (string, error) {
	templatesDir := filepath.Join("data", "templates")
	if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
		if err := os.MkdirAll(templatesDir, 0755); err != nil {
			return "", err
		}
		slog.InfoContext(ctx, "Created templates directory", "path", templatesDir)
	}
	return templatesDir, nil
}

func CreateUniqueDir(basePath, name string, perm os.FileMode) (path, folderName string, err error) {
	sanitized := SanitizeProjectName(name)

	// Reject empty or invalid sanitized names
	if sanitized == "" || strings.Trim(sanitized, "_") == "" {
		return "", "", fmt.Errorf("invalid project name: results in empty directory name")
	}

	candidate := basePath
	folderName = sanitized

	// Get absolute path of parent directory for validation
	parentAbs, err := filepath.Abs(filepath.Dir(basePath))
	if err != nil {
		return "", "", fmt.Errorf("failed to resolve parent directory: %w", err)
	}

	for counter := 1; ; counter++ {
		// Validate candidate is within allowed parent
		candidateAbs, absErr := filepath.Abs(candidate)
		if absErr != nil {
			return "", "", fmt.Errorf("failed to resolve candidate path: %w", absErr)
		}

		rel, relErr := filepath.Rel(parentAbs, candidateAbs)
		if relErr != nil || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
			return "", "", fmt.Errorf("project directory would be outside allowed path")
		}

		if mkErr := os.Mkdir(candidate, perm); mkErr == nil {
			return candidate, folderName, nil
		} else if !os.IsExist(mkErr) {
			return "", "", mkErr
		}
		candidate = fmt.Sprintf("%s-%d", basePath, counter)
		folderName = fmt.Sprintf("%s-%d", sanitized, counter)
	}
}

func SanitizeProjectName(name string) string {
	name = strings.TrimSpace(name)
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '-' || r == '_' {
			return r
		}
		return '_'
	}, name)
}

// IsSafeSubdirectory returns true if subdir is a subdirectory of baseDir (absolute, normalized)
func IsSafeSubdirectory(baseDir, subdir string) bool {
	absBase, err1 := filepath.Abs(baseDir)
	absSubdir, err2 := filepath.Abs(subdir)
	if err1 != nil || err2 != nil {
		return false
	}

	// Ensure both paths end consistently for comparison
	absBase = filepath.Clean(absBase)
	absSubdir = filepath.Clean(absSubdir)

	rel, err := filepath.Rel(absBase, absSubdir)
	if err != nil {
		return false
	}

	// The path must not escape the base directory
	return !strings.HasPrefix(rel, "..") && !filepath.IsAbs(rel)
}

func SaveOrUpdateProjectFiles(projectPath, composeContent string, envContent *string) error {
	return WriteProjectFiles(projectPath, composeContent, envContent)
}
