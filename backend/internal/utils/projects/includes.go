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

// ValidateIncludePathForRead validates that an include path is safe to read
// Allows reading from anywhere (Docker Compose includes can reference external files)
func ValidateIncludePathForRead(includePath string) error {
	if includePath == "" {
		return fmt.Errorf("include path cannot be empty")
	}
	return nil
}

// ValidateIncludePathForWrite ensures the include path is safe for write operations
// Only allows writing within the project directory OR to files that already exist
func ValidateIncludePathForWrite(projectDir, includePath string, allowExisting bool) error {
	if includePath == "" {
		return fmt.Errorf("include path cannot be empty")
	}

	// Resolve project directory to absolute path
	absProjectDir, err := filepath.Abs(projectDir)
	if err != nil {
		return fmt.Errorf("invalid project directory: %w", err)
	}
	absProjectDir = filepath.Clean(absProjectDir)

	// Resolve include path to absolute path
	var fullPath string
	if filepath.IsAbs(includePath) {
		fullPath = includePath
	} else {
		fullPath = filepath.Join(absProjectDir, includePath)
	}

	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		return fmt.Errorf("invalid include path: %w", err)
	}
	absFullPath = filepath.Clean(absFullPath)

	// Prevent targeting the project directory itself
	if absFullPath == absProjectDir {
		return fmt.Errorf("include path cannot be the project directory itself")
	}

	// Check if path is within project directory
	projectPrefix := absProjectDir + string(filepath.Separator)
	isWithinProject := strings.HasPrefix(absFullPath+string(filepath.Separator), projectPrefix)

	if isWithinProject {
		// Path is within project - allow write
		return nil
	}

	// Path is outside project - only allow if file already exists and allowExisting is true
	if allowExisting {
		if _, err := os.Stat(absFullPath); err == nil {
			// File exists - allow write to existing file
			return nil
		}
	}

	return fmt.Errorf("write access denied: path is outside project directory and file does not exist")
}

// WriteIncludeFile writes content to an include file path
func WriteIncludeFile(projectDir, includePath, content string) error {
	// Allow writing to existing files or files within project
	if err := ValidateIncludePathForWrite(projectDir, includePath, true); err != nil {
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
	
	// Only validate that the directory path is not empty or current directory
	if dir == "" || dir == "." {
		return fmt.Errorf("invalid include path: cannot create directory '%s'", dir)
	}
	
	// Only create directory if it doesn't exist
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write include file: %w", err)
	}

	return nil
}

// DeleteIncludeFile removes an include file
func DeleteIncludeFile(projectDir, includePath string) error {
	// Only allow deleting files within project directory
	if err := ValidateIncludePathForWrite(projectDir, includePath, false); err != nil {
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
