package projects

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestWriteIncludeFileCreatesSafeDirectory(t *testing.T) {
	t.Parallel()

	projectDir := t.TempDir()
	includePath := filepath.Join("includes", "config.yaml")
	content := "services: {}\n"

	if err := WriteIncludeFile(projectDir, includePath, content); err != nil {
		t.Fatalf("WriteIncludeFile() returned error: %v", err)
	}

	targetPath := filepath.Join(projectDir, includePath)
	data, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("failed to read include file: %v", err)
	}

	if string(data) != content {
		t.Fatalf("unexpected file content: got %q, want %q", string(data), content)
	}
}

func TestWriteIncludeFileRejectsSymlinkEscape(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink creation requires elevated privileges on Windows")
	}
	t.Parallel()

	projectDir := t.TempDir()
	outsideDir := t.TempDir()

	linkPath := filepath.Join(projectDir, "link")
	if err := os.Symlink(outsideDir, linkPath); err != nil {
		t.Fatalf("failed to create symlink: %v", err)
	}

	includePath := filepath.Join("link", "escape.yaml")
	err := WriteIncludeFile(projectDir, includePath, "malicious: true\n")
	if err == nil {
		t.Fatalf("WriteIncludeFile() succeeded but expected rejection for symlink escape")
	}
}
