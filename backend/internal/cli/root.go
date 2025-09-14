package cli

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/ofkm/arcane-backend/internal/bootstrap"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/startup"
	"github.com/spf13/cobra"
)

var (
	devFlag         bool
	dataDirFlag     string
	projectsDirFlag string
)

var rootCmd = &cobra.Command{
	Use:   "arcane",
	Short: "Arcane backend",
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		slog.Error("cli execute failed", "err", err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&devFlag, "dev", false, "Run in local development mode (uses ./data, skips chown)")
	rootCmd.PersistentFlags().StringVar(&dataDirFlag, "data-dir", "", "Override data directory path")
	rootCmd.PersistentFlags().StringVar(&projectsDirFlag, "projects-dir", "", "Override projects directory path")

	rootCmd.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
		bootstrap.SetupLogger(&config.Config{})

		cfg := startup.FromEnv()

		// Flags override env; in --dev force ./data unless explicitly overridden
		if devFlag {
			cfg.DevMode = true
			cfg.SkipChown = true
			if dataDirFlag == "" {
				cfg.DataDir = "./data"
			}
			if projectsDirFlag == "" {
				cfg.ProjectsDir = filepath.Join(cfg.DataDir, "projects")
			}
		}
		if dataDirFlag != "" {
			cfg.DataDir = dataDirFlag
		}
		if projectsDirFlag != "" {
			cfg.ProjectsDir = projectsDirFlag
		}

		// Use current user/group when running locally
		cfg.PUID = os.Geteuid()
		cfg.PGID = os.Getegid()

		return startup.Preflight(context.Background(), cfg)
	}
}
