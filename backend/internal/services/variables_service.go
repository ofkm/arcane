package services

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/utils/fs"
)

type GlobalVariablesService struct {
	db              *database.DB
	settingsService *SettingsService
}

func NewGlobalVariablesService(db *database.DB, settingsService *SettingsService) *GlobalVariablesService {
	return &GlobalVariablesService{
		db:              db,
		settingsService: settingsService,
	}
}

func (s *GlobalVariablesService) getGlobalVariablesPath(ctx context.Context) (string, error) {
	projectsDirectory, err := fs.GetProjectsDirectory(ctx, s.settingsService.GetStringSetting(ctx, "projectsDirectory", "data/projects"))
	if err != nil {
		return "", fmt.Errorf("failed to get projects directory: %w", err)
	}

	return filepath.Join(projectsDirectory, ".env.global"), nil
}

func (s *GlobalVariablesService) GetGlobalVariables(ctx context.Context) ([]dto.GlobalVariableDto, error) {
	envPath, err := s.getGlobalVariablesPath(ctx)
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		slog.DebugContext(ctx, "Global variables file does not exist yet", "path", envPath)
		return []dto.GlobalVariableDto{}, nil
	}

	file, err := os.Open(envPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open global variables file: %w", err)
	}
	defer file.Close()

	vars := []dto.GlobalVariableDto{}
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse KEY=VALUE format
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			slog.WarnContext(ctx, "Skipping invalid line in global variables file",
				"line", lineNum,
				"content", line)
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Remove quotes if present
		if len(value) >= 2 {
			if (strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`)) ||
				(strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`)) {
				value = value[1 : len(value)-1]
			}
		}

		vars = append(vars, dto.GlobalVariableDto{
			Key:   key,
			Value: value,
		})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading global variables file: %w", err)
	}

	// Sort by key for consistent ordering
	sort.Slice(vars, func(i, j int) bool {
		return vars[i].Key < vars[j].Key
	})

	return vars, nil
}

func (s *GlobalVariablesService) UpdateGlobalVariables(ctx context.Context, vars []dto.GlobalVariableDto) error {
	envPath, err := s.getGlobalVariablesPath(ctx)
	if err != nil {
		return err
	}

	projectsDirectory := filepath.Dir(envPath)
	if err := os.MkdirAll(projectsDirectory, 0755); err != nil {
		return fmt.Errorf("failed to create projects directory: %w", err)
	}

	var builder strings.Builder
	builder.WriteString("# Global Environment Variables\n")
	builder.WriteString("# These variables are available to all projects\n")
	builder.WriteString("# Last updated: " + ctx.Value("timestamp").(string) + "\n\n")

	// Sort by key for consistent ordering
	sortedVars := make([]dto.GlobalVariableDto, len(vars))
	copy(sortedVars, vars)
	sort.Slice(sortedVars, func(i, j int) bool {
		return sortedVars[i].Key < sortedVars[j].Key
	})

	for _, v := range sortedVars {
		if strings.TrimSpace(v.Key) == "" {
			continue
		}

		key := strings.TrimSpace(v.Key)
		value := strings.TrimSpace(v.Value)

		// Quote values that contain spaces or special characters
		if strings.ContainsAny(value, " \t\n\r#") {
			value = fmt.Sprintf(`"%s"`, strings.ReplaceAll(value, `"`, `\"`))
		}

		builder.WriteString(fmt.Sprintf("%s=%s\n", key, value))
	}

	// Write to file with restricted permissions
	if err := os.WriteFile(envPath, []byte(builder.String()), 0600); err != nil {
		return fmt.Errorf("failed to write global variables file: %w", err)
	}

	slog.InfoContext(ctx, "Updated global variables",
		"path", envPath,
		"count", len(sortedVars))

	return nil
}
