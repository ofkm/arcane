package projects

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/goccy/go-yaml"
)

type IncludeFile struct {
	Path         string `json:"path"`
	RelativePath string `json:"relative_path"`
	Content      string `json:"content"`
}

// ParseIncludes reads a compose file and extracts all include directives
func ParseIncludes(composeFilePath string) ([]IncludeFile, error) {
	content, err := os.ReadFile(composeFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read compose file: %w", err)
	}

	var composeData map[string]interface{}
	if err := yaml.Unmarshal(content, &composeData); err != nil {
		return nil, fmt.Errorf("failed to parse compose file: %w", err)
	}

	// Look for include at root level only (per Docker Compose spec)
	includes, ok := composeData["include"]
	if !ok {
		return []IncludeFile{}, nil
	}

	composeDir := filepath.Dir(composeFilePath)
	var includeFiles []IncludeFile

	switch v := includes.(type) {
	case []interface{}:
		for _, item := range v {
			if include, err := parseIncludeItem(item, composeDir); err == nil {
				includeFiles = append(includeFiles, include)
			}
		}
	case string:
		if include, err := parseIncludeItem(v, composeDir); err == nil {
			includeFiles = append(includeFiles, include)
		}
	}

	return includeFiles, nil
}

func parseIncludeItem(item interface{}, baseDir string) (IncludeFile, error) {
	var includePath string

	switch v := item.(type) {
	case string:
		includePath = v
	case map[string]interface{}:
		if path, ok := v["path"].(string); ok {
			includePath = path
		}
	default:
		return IncludeFile{}, fmt.Errorf("invalid include item type")
	}

	if includePath == "" {
		return IncludeFile{}, fmt.Errorf("empty include path")
	}

	var fullPath string
	if filepath.IsAbs(includePath) {
		fullPath = includePath
	} else {
		fullPath = filepath.Join(baseDir, includePath)
	}

	fullPath = filepath.Clean(fullPath)

	var content string
	fileContent, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			// File doesn't exist yet - return empty content so it can be created
			content = "# This file will be created when you save changes\nservices:\n"
		} else {
			return IncludeFile{}, fmt.Errorf("failed to read include file %s: %w", includePath, err)
		}
	} else {
		content = string(fileContent)
	}

	relativePath := includePath
	if filepath.IsAbs(includePath) {
		if rel, err := filepath.Rel(baseDir, fullPath); err == nil {
			relativePath = rel
		}
	}

	return IncludeFile{
		Path:         fullPath,
		RelativePath: relativePath,
		Content:      content,
	}, nil
}

// ValidateIncludePath ensures the include path is safe (no path traversal outside project)
func ValidateIncludePath(projectDir, includePath string) error {
	var fullPath string
	if filepath.IsAbs(includePath) {
		fullPath = includePath
	} else {
		fullPath = filepath.Join(projectDir, includePath)
	}

	fullPath = filepath.Clean(fullPath)
	projectDir = filepath.Clean(projectDir)

	relPath, err := filepath.Rel(projectDir, fullPath)
	if err != nil {
		return fmt.Errorf("invalid include path: %w", err)
	}

	if strings.HasPrefix(relPath, "..") {
		return fmt.Errorf("include path cannot reference files outside project directory")
	}

	return nil
}

// WriteIncludeFile writes content to an include file path
func WriteIncludeFile(projectDir, includePath, content string) error {
	if err := ValidateIncludePath(projectDir, includePath); err != nil {
		return err
	}

	var fullPath string
	if filepath.IsAbs(includePath) {
		fullPath = includePath
	} else {
		fullPath = filepath.Join(projectDir, includePath)
	}

	fullPath = filepath.Clean(fullPath)

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write include file: %w", err)
	}

	return nil
}

// DeleteIncludeFile removes an include file
func DeleteIncludeFile(projectDir, includePath string) error {
	if err := ValidateIncludePath(projectDir, includePath); err != nil {
		return err
	}

	var fullPath string
	if filepath.IsAbs(includePath) {
		fullPath = includePath
	} else {
		fullPath = filepath.Join(projectDir, includePath)
	}

	fullPath = filepath.Clean(fullPath)

	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete include file: %w", err)
	}

	return nil
}
