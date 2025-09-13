package fs

import (
	"fmt"
	"os"
	"path/filepath"
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

func ReadRootComposeTemplate(baseDir, fileName string) (string, string, *string, string, error) {
	ext := strings.ToLower(filepath.Ext(fileName))
	base := strings.TrimSuffix(fileName, ext)
	composePath := filepath.Join(baseDir, fileName)

	b, err := os.ReadFile(composePath)
	if err != nil {
		return "", "", nil, "", fmt.Errorf("read compose %s: %w", composePath, err)
	}

	var envPtr *string
	for _, envExt := range []string{".env.example", ".env"} {
		envPath := filepath.Join(baseDir, base+envExt)
		if eb, err := os.ReadFile(envPath); err == nil {
			env := string(eb)
			envPtr = &env
			break
		}
	}

	desc := fmt.Sprintf("Imported from %s/%s", baseDir, fileName)
	return base, string(b), envPtr, desc, nil
}
