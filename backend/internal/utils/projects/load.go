package projects

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/compose-spec/compose-go/v2/cli"
	composetypes "github.com/compose-spec/compose-go/v2/types"
	"github.com/joho/godotenv"
)

var ComposeFileCandidates = []string{
	"compose.yaml",
	"compose.yml",
	"docker-compose.yaml",
	"docker-compose.yml",
}

func locateComposeFile(stackDir string) string {
	for _, filename := range ComposeFileCandidates {
		fullPath := filepath.Join(stackDir, filename)
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

func LoadComposeProject(ctx context.Context, composeFile, projectName string) (*composetypes.Project, error) {
	workdir := filepath.Dir(composeFile)
	envFile := filepath.Join(workdir, ".env")

	// Merge OS env with .env (OS wins)
	envMap := map[string]string{}
	for _, kv := range os.Environ() {
		if k, v, ok := strings.Cut(kv, "="); ok {
			envMap[k] = v
		}
	}
	if info, err := os.Stat(envFile); err == nil && !info.IsDir() {
		if fileEnv, rerr := godotenv.Read(envFile); rerr == nil {
			for k, v := range fileEnv {
				if _, exists := envMap[k]; !exists {
					envMap[k] = v
				}
			}
		}
	}

	// Convert to slice for cli.WithEnv
	keys := make([]string, 0, len(envMap))
	for k := range envMap {
		keys = append(keys, k)
	}
	sort.Strings(keys) // deterministic
	envSlice := make([]string, 0, len(envMap))
	for _, k := range keys {
		envSlice = append(envSlice, fmt.Sprintf("%s=%s", k, envMap[k]))
	}

	opts, err := cli.NewProjectOptions(
		[]string{composeFile},
		cli.WithWorkingDirectory(workdir),
		cli.WithName(projectName),
		cli.WithInterpolation(true),
		cli.WithEnv(envSlice),
	)
	if err != nil {
		return nil, fmt.Errorf("create project options: %w", err)
	}

	proj, err := opts.LoadProject(ctx)
	if err != nil {
		return nil, fmt.Errorf("load project: %w", err)
	}

	if resolved, rerr := proj.WithServicesEnvironmentResolved(false); rerr == nil && resolved != nil {
		proj = resolved
	}

	return proj, nil
}

func LoadComposeProjectFromDir(ctx context.Context, dir, projectName string) (*composetypes.Project, string, error) {
	composeFile, err := DetectComposeFile(dir)
	if err != nil {
		return nil, "", err
	}
	proj, err := LoadComposeProject(ctx, composeFile, projectName)
	if err != nil {
		return nil, "", err
	}
	return proj, composeFile, nil
}
