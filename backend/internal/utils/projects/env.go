package projects

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	globalEnvFileName  = ".env.global"
	projectEnvFileName = ".env"
	globalEnvHeader    = `# Global Environment Variables
# These variables are available to all projects
# Created: %s

`
)

type EnvMap map[string]string

type EnvLoader struct {
	projectsDir string
	workdir     string
}

func NewEnvLoader(projectsDir, workdir string) *EnvLoader {
	return &EnvLoader{
		projectsDir: projectsDir,
		workdir:     workdir,
	}
}

// LoadEnvironment loads and merges environment variables from all sources:
// 1. Process environment
// 2. Global .env.global file (from projects directory)
// 3. Project-specific .env file (from workdir)
func (l *EnvLoader) LoadEnvironment(ctx context.Context) (envMap EnvMap, injectionVars EnvMap, err error) {
	envMap = l.loadProcessEnv()
	injectionVars = make(EnvMap)

	globalEnvPath := filepath.Join(l.projectsDir, globalEnvFileName)
	if err := l.ensureGlobalEnvFile(ctx, globalEnvPath); err != nil {
		slog.WarnContext(ctx, "Failed to ensure global env file", "path", globalEnvPath, "error", err)
	}

	if err := l.loadAndMergeGlobalEnv(ctx, globalEnvPath, envMap, injectionVars); err != nil {
		slog.WarnContext(ctx, "Failed to load global env", "path", globalEnvPath, "error", err)
	}

	projectEnvPath := filepath.Join(l.workdir, projectEnvFileName)
	if err := l.loadAndMergeProjectEnv(ctx, projectEnvPath, envMap, injectionVars); err != nil {
		slog.WarnContext(ctx, "Failed to load project env", "path", projectEnvPath, "error", err)
	}

	return envMap, injectionVars, nil
}

func (l *EnvLoader) loadProcessEnv() EnvMap {
	envMap := make(EnvMap)
	for _, kv := range os.Environ() {
		if k, v, ok := strings.Cut(kv, "="); ok {
			envMap[k] = v
		}
	}
	return envMap
}

func (l *EnvLoader) ensureGlobalEnvFile(ctx context.Context, path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		header := fmt.Sprintf(globalEnvHeader, time.Now().Format(time.RFC3339))
		if werr := os.WriteFile(path, []byte(header), 0600); werr != nil {
			return fmt.Errorf("write file: %w", werr)
		}
		slog.InfoContext(ctx, "Created global env file", "path", path)
	} else if err != nil {
		slog.DebugContext(ctx, "Could not stat global env file", "path", path, "error", err)
	}
	return nil
}

func (l *EnvLoader) loadAndMergeGlobalEnv(ctx context.Context, path string, envMap, injectionVars EnvMap) error {
	slog.DebugContext(ctx, "Checking for global env file", "path", path)

	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			slog.DebugContext(ctx, "Global env file does not exist", "path", path)
		} else {
			slog.DebugContext(ctx, "Global env file not accessible", "path", path, "error", err)
		}
		return err
	}

	if info.IsDir() {
		return fmt.Errorf("path is a directory: %s", path)
	}

	slog.DebugContext(ctx, "Found global env file", "path", path)

	globalEnv, err := parseEnvFile(path)
	if err != nil {
		return fmt.Errorf("parse env file: %w", err)
	}

	slog.DebugContext(ctx, "Read global env file", "count", len(globalEnv))

	for k, v := range globalEnv {
		if _, exists := envMap[k]; !exists {
			envMap[k] = v
		}
		injectionVars[k] = v
	}

	slog.DebugContext(ctx, "Merged global env into environment map", "total_env_count", len(envMap))
	return nil
}

func (l *EnvLoader) loadAndMergeProjectEnv(ctx context.Context, path string, envMap, injectionVars EnvMap) error {
	slog.DebugContext(ctx, "Checking for project .env file", "path", path)

	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			slog.DebugContext(ctx, "Project .env file does not exist", "path", path)
		} else {
			slog.DebugContext(ctx, "Project .env file not accessible", "path", path, "error", err)
		}
		return err
	}

	if info.IsDir() {
		return fmt.Errorf("path is a directory: %s", path)
	}

	slog.DebugContext(ctx, "Found project .env file", "path", path)

	projectEnv, err := parseEnvFile(path)
	if err != nil {
		return fmt.Errorf("parse env file: %w", err)
	}

	slog.DebugContext(ctx, "Read project .env file", "count", len(projectEnv))

	for k, v := range projectEnv {
		envMap[k] = v
		injectionVars[k] = v
	}

	slog.DebugContext(ctx, "Merged project .env into environment map", "total_env_count", len(envMap))
	return nil
}

func parseEnvFile(path string) (EnvMap, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open file: %w", err)
	}
	defer f.Close()

	envMap := make(EnvMap)
	scanner := bufio.NewScanner(f)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split on first '=' to get key and value
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Strip surrounding quotes and unescape
		value = stripQuotes(value)

		envMap[key] = value
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan file: %w", err)
	}

	return envMap, nil
}

func stripQuotes(value string) string {
	if len(value) < 2 {
		return value
	}

	// Check for surrounding quotes (either double or single)
	if (strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`)) ||
		(strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`)) {
		// Remove surrounding quotes
		value = value[1 : len(value)-1]
		// Unescape inner double-quotes
		value = strings.ReplaceAll(value, `\"`, `"`)
	}

	return value
}
