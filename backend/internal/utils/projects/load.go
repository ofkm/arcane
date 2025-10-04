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

	"github.com/compose-spec/compose-go/v2/loader"
	composetypes "github.com/compose-spec/compose-go/v2/types"
	"github.com/docker/compose/v2/pkg/api"
)

var ComposeFileCandidates = []string{
	"compose.yaml",
	"compose.yml",
	"docker-compose.yaml",
	"docker-compose.yml",
}

func locateComposeFile(projectsDir string) string {
	for _, filename := range ComposeFileCandidates {
		fullPath := filepath.Join(projectsDir, filename)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			return fullPath
		}
	}
	return ""
}

func DetectComposeFile(dir string) (string, error) {
	compose := locateComposeFile(dir)
	if compose == "" {
		return "", fmt.Errorf("no compose file found in %q", dir)
	}

	return compose, nil
}

func LoadComposeProject(ctx context.Context, composeFile, projectName, projectsDirectory string) (*composetypes.Project, error) {
	workdir := filepath.Dir(composeFile)
	envFile := filepath.Join(workdir, ".env")
	// Use configured projects directory instead of deriving from compose path
	projectsDir := projectsDirectory
	if projectsDir == "" {
		// Fallback to deriving from workdir if not provided
		projectsDir = filepath.Dir(workdir)
	}
	globalEnvFile := filepath.Join(projectsDir, ".env.global")
	if _, err := os.Stat(globalEnvFile); os.IsNotExist(err) {
		header := fmt.Sprintf("# Global Environment Variables\n# These variables are available to all projects\n# Created: %s\n\n", time.Now().Format(time.RFC3339))
		if werr := os.WriteFile(globalEnvFile, []byte(header), 0600); werr != nil {
			slog.WarnContext(ctx, "Failed to create global env file", "path", globalEnvFile, "error", werr)
		} else {
			slog.InfoContext(ctx, "Created global env file", "path", globalEnvFile)
		}
	} else if err != nil {
		slog.DebugContext(ctx, "Could not stat global env file", "path", globalEnvFile, "error", err)
	}

	envMap := map[string]string{}
	for _, kv := range os.Environ() {
		if k, v, ok := strings.Cut(kv, "="); ok {
			envMap[k] = v
		}
	}

	// Track global and project-specific env vars separately to inject into services
	globalAndProjectEnv := make(map[string]string)

	slog.DebugContext(ctx, "Checking for global env file", "path", globalEnvFile)
	if info, err := os.Stat(globalEnvFile); err == nil && !info.IsDir() {
		slog.DebugContext(ctx, "Found global env file", "path", globalEnvFile)
		if globalEnv, rerr := parseEnvFileToMap(globalEnvFile); rerr == nil {
			slog.DebugContext(ctx, "Read global env file", "count", len(globalEnv))
			for k, v := range globalEnv {
				if _, exists := envMap[k]; !exists {
					envMap[k] = v
				}
				globalAndProjectEnv[k] = v
			}
			slog.DebugContext(ctx, "Merged global env into environment map", "total_env_count", len(envMap))
		} else {
			slog.WarnContext(ctx, "Failed to read global env file", "path", globalEnvFile, "error", rerr)
		}
	} else {
		if err != nil {
			slog.DebugContext(ctx, "Global env file not present or inaccessible", "path", globalEnvFile, "error", err)
		} else {
			slog.DebugContext(ctx, "Global env file does not exist", "path", globalEnvFile)
		}
	}

	slog.DebugContext(ctx, "Checking for project .env file", "path", envFile)
	if info, err := os.Stat(envFile); err == nil && !info.IsDir() {
		slog.DebugContext(ctx, "Found project .env file", "path", envFile)
		if fileEnv, rerr := parseEnvFileToMap(envFile); rerr == nil {
			slog.DebugContext(ctx, "Read project .env file", "count", len(fileEnv))
			for k, v := range fileEnv {
				envMap[k] = v
				globalAndProjectEnv[k] = v
			}
			slog.DebugContext(ctx, "Merged project .env into environment map", "total_env_count", len(envMap))
		} else {
			slog.WarnContext(ctx, "Failed to read project .env file", "path", envFile, "error", rerr)
		}
	} else {
		if err != nil {
			slog.DebugContext(ctx, "Project .env file not present or inaccessible", "path", envFile, "error", err)
		} else {
			slog.DebugContext(ctx, "Project .env file does not exist", "path", envFile)
		}
	}

	cfg := composetypes.ConfigDetails{
		WorkingDir: workdir,
		ConfigFiles: []composetypes.ConfigFile{
			{Filename: composeFile},
		},
		Environment: composetypes.Mapping(envMap),
	}

	project, err := loader.LoadWithContext(ctx, cfg, func(opts *loader.Options) {
		opts.SetProjectName(projectName, true)
	})
	if err != nil {
		return nil, fmt.Errorf("load compose project: %w", err)
	}

	project = project.WithoutUnnecessaryResources()

	// Inject global and project env vars into each service's environment
	for i, s := range project.Services {
		if s.Environment == nil {
			s.Environment = make(composetypes.MappingWithEquals)
		}
		for k, v := range globalAndProjectEnv {
			if _, exists := s.Environment[k]; !exists {
				vcopy := v
				s.Environment[k] = &vcopy
			}
		}

		if s.CustomLabels == nil {
			s.CustomLabels = composetypes.Labels{}
		}
		s.CustomLabels[api.ProjectLabel] = project.Name
		s.CustomLabels[api.ServiceLabel] = s.Name
		s.CustomLabels[api.VersionLabel] = api.ComposeVersion
		s.CustomLabels[api.OneoffLabel] = "False"
		s.CustomLabels[api.WorkingDirLabel] = workdir
		s.CustomLabels[api.ConfigFilesLabel] = composeFile

		project.Services[i] = s
	}

	project.ComposeFiles = []string{composeFile}
	return project, nil
}

func LoadComposeProjectFromDir(ctx context.Context, dir, projectName, projectsDirectory string) (*composetypes.Project, string, error) {
	composeFile, err := DetectComposeFile(dir)
	if err != nil {
		return nil, "", err
	}
	proj, err := LoadComposeProject(ctx, composeFile, projectName, projectsDirectory)
	if err != nil {
		return nil, "", err
	}
	return proj, composeFile, nil
}

func parseEnvFileToMap(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	m := make(map[string]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		if len(value) >= 2 {
			if (strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`)) ||
				(strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`)) {
				// strip surrounding quotes
				value = value[1 : len(value)-1]
				// unescape inner double-quotes sequences
				value = strings.ReplaceAll(value, `\"`, `"`)
			}
		}
		m[key] = value
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return m, nil
}
