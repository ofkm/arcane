package projects

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/compose-spec/compose-go/v2/cli"
	composetypes "github.com/compose-spec/compose-go/v2/types"
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
	opts, err := cli.NewProjectOptions(
		[]string{composeFile},
		cli.WithWorkingDirectory(filepath.Dir(composeFile)),
		cli.WithOsEnv,
		cli.WithDotEnv,
		cli.WithName(projectName),
	)
	if err != nil {
		return nil, fmt.Errorf("create project options: %w", err)
	}
	proj, err := opts.LoadProject(ctx)
	if err != nil {
		return nil, fmt.Errorf("load project: %w", err)
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
