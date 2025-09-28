package projects

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/compose-spec/compose-go/v2/loader"
	composetypes "github.com/compose-spec/compose-go/v2/types"
	"github.com/docker/compose/v2/pkg/api"
	"github.com/joho/godotenv"
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

func LoadComposeProject(ctx context.Context, composeFile, projectName string) (*composetypes.Project, error) {
	workdir := filepath.Dir(composeFile)
	envFile := filepath.Join(workdir, ".env")

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

	// Ensure Compose discovery labels via CustomLabels
	for i, s := range project.Services {
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
