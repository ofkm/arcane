package fs

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func ReadFolderComposeTemplate(baseDir, folder string) (string, *string, string, bool, error) {
	composePath := filepath.Join(baseDir, folder, "compose.yaml")
	if _, err := os.Stat(composePath); err != nil {
		if os.IsNotExist(err) {
			return "", nil, "", false, nil
		}
		return "", nil, "", false, fmt.Errorf("stat compose: %w", err)
	}

	b, err := os.ReadFile(composePath)
	if err != nil {
		return "", nil, "", false, fmt.Errorf("read compose %s: %w", composePath, err)
	}

	var envPtr *string
	for _, envName := range []string{".env.example", ".env"} {
		envPath := filepath.Join(baseDir, folder, envName)
		if eb, err := os.ReadFile(envPath); err == nil {
			env := string(eb)
			envPtr = &env
			break
		}
	}

	desc := fmt.Sprintf("Imported from %s/%s/compose.yaml", baseDir, folder)
	return string(b), envPtr, desc, true, nil
}

func Slugify(in string) string {
	in = strings.TrimSpace(strings.ToLower(in))
	if in == "" {
		return ""
	}
	in = strings.ReplaceAll(in, " ", "-")
	re := regexp.MustCompile(`[^a-z0-9\-_]+`)
	in = re.ReplaceAllString(in, "-")
	in = regexp.MustCompile(`-+`).ReplaceAllString(in, "-")
	return strings.Trim(in, "-")
}

func EnsureTemplateDir(ctx context.Context, base string) (dir, composePath, envPath string, err error) {
	baseDir, derr := GetTemplatesDirectory(ctx)
	if derr != nil {
		return "", "", "", fmt.Errorf("ensure templates dir: %w", derr)
	}
	dir = filepath.Join(baseDir, base)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", "", "", fmt.Errorf("failed to create template directory: %w", err)
	}
	composePath = filepath.Join(dir, "compose.yaml")
	envPath = filepath.Join(dir, ".env.example")
	return dir, composePath, envPath, nil
}

func ImportedComposeDescription(dir string) string {
	return fmt.Sprintf("Imported from %s/compose.yaml", dir)
}

func WriteTemplateFiles(composePath, envPath, composeContent, envContent string) (*string, error) {
	if err := os.WriteFile(composePath, []byte(composeContent), 0600); err != nil {
		return nil, fmt.Errorf("failed to write compose file: %w", err)
	}
	envTrim := strings.TrimSpace(envContent)
	if envTrim == "" {
		return nil, nil
	}
	if err := os.WriteFile(envPath, []byte(envContent), 0600); err != nil {
		return nil, fmt.Errorf("failed to write env file: %w", err)
	}
	return &envContent, nil
}
