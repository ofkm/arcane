package startup

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type PreflightConfig struct {
	DataDir     string
	ProjectsDir string
	PUID        int
	PGID        int
	DevMode     bool
	SkipChown   bool
}

func FromEnv() PreflightConfig {
	dev := false
	if v := strings.ToLower(os.Getenv("ARCANE_DEV")); v == "1" || v == "true" || v == "yes" {
		dev = true
	}
	puid := os.Geteuid()
	if v := os.Getenv("PUID"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			puid = n
		}
	}
	pgid := os.Getegid()
	if v := os.Getenv("PGID"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			pgid = n
		}
	}

	// Defaults
	data := os.Getenv("DATA_DIR")
	projects := os.Getenv("PROJECTS_DIR")

	if dev {
		if data == "" {
			data = "./data"
		}
		if projects == "" {
			projects = filepath.Join(data, "projects")
		}
	} else {
		if data == "" {
			data = "/app/data"
		}
		if projects == "" {
			projects = filepath.Join(data, "projects")
		}
	}

	return PreflightConfig{
		DataDir:     data,
		ProjectsDir: projects,
		PUID:        puid,
		PGID:        pgid,
		DevMode:     dev,
		SkipChown:   dev || os.Geteuid() != 0, // skip chown if not root
	}
}

func isMountpoint(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	parent := filepath.Dir(path)
	pinfo, err := os.Stat(parent)
	if err != nil {
		return false
	}
	s1, ok1 := info.Sys().(*syscall.Stat_t)
	s2, ok2 := pinfo.Sys().(*syscall.Stat_t)
	if !ok1 || !ok2 {
		return false
	}
	return s1.Dev != s2.Dev
}

func chownR(root string, uid, gid int, skip string) error {
	return filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if skip != "" && p == skip {
			return filepath.SkipDir
		}
		_ = os.Lchown(p, uid, gid)
		return nil
	})
}

func Preflight(ctx context.Context, cfg PreflightConfig) error {
	start := time.Now()
	log := slog.Default()

	if err := os.MkdirAll(cfg.DataDir, 0o775); err != nil {
		return fmt.Errorf("preflight: mkdir %s: %w", cfg.DataDir, err)
	}

	// Skip recursive chown in dev to avoid host permission changes
	if !cfg.SkipChown {
		skipProjects := false
		if fi, err := os.Stat(cfg.ProjectsDir); err == nil && fi.IsDir() && isMountpoint(cfg.ProjectsDir) {
			skipProjects = true
			log.Info("preflight: detected bind-mounted projects, skipping recursive chown", "projectsDir", cfg.ProjectsDir)
		}
		_ = os.Chown(cfg.DataDir, cfg.PUID, cfg.PGID)
		_ = chownR(cfg.DataDir, cfg.PUID, cfg.PGID, map[bool]string{true: cfg.ProjectsDir, false: ""}[skipProjects])
	}

	// Verify writability
	testFile := filepath.Join(cfg.DataDir, ".rwtest")
	if err := os.WriteFile(testFile, []byte("ok"), 0o664); err != nil {
		return fmt.Errorf("preflight: %s not writable: %w", cfg.DataDir, err)
	}
	_ = os.Remove(testFile)

	// Favor group-writable files
	old := syscall.Umask(0o002)
	log.Info("preflight: set umask", "old", fmt.Sprintf("%#o", old), "new", "002", "dev", cfg.DevMode)

	log.Info("preflight: complete", "elapsed", time.Since(start).String(), "dataDir", cfg.DataDir, "projectsDir", cfg.ProjectsDir, "dev", cfg.DevMode)
	return nil
}
