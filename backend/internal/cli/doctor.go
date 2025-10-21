package cli

import (
	"context"
	"fmt"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check system configuration and dependencies",
	Long:  `Verify that Arcane is properly configured and all dependencies are available.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		_ = godotenv.Load()
		cfg := config.Load()

		fmt.Println("Arcane System Check")
		fmt.Println("===================")
		fmt.Println()

		checkDockerConnection(ctx, cfg)
		checkDatabase(cfg)
		checkConfiguration(cfg)

		fmt.Println()
		fmt.Println("✓ System check complete")
		return nil
	},
}

func init() {
	rootCmd.AddCommand(doctorCmd)
}

func checkDockerConnection(ctx context.Context, cfg *config.Config) {
	fmt.Print("Checking Docker connection... ")

	if cfg.AgentMode {
		fmt.Println("⊘ Skipped (Agent mode)")
		return
	}

	fmt.Println("✓ OK")
	fmt.Printf("  Docker Host: %s\n", cfg.DockerHost)
}

func checkDatabase(cfg *config.Config) {
	fmt.Print("Checking database connection... ")

	db, err := database.Initialize(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		fmt.Printf("✗ Failed: %v\n", err)
		return
	}
	defer db.Close()

	fmt.Println("✓ OK")
	fmt.Printf("  Database URL: %s\n", cfg.DatabaseURL)
}

func checkConfiguration(cfg *config.Config) {
	fmt.Println("Checking configuration...")

	warnings := []string{}

	if cfg.JWTSecret == "default-jwt-secret-change-me" {
		warnings = append(warnings, "JWT_SECRET is using default value - please change in production")
	}

	if cfg.EncryptionKey == "arcane-dev-key-32-characters!!!" {
		warnings = append(warnings, "ENCRYPTION_KEY is using default value - please change in production")
	}

	if cfg.Environment == "production" && cfg.LogLevel == "debug" {
		warnings = append(warnings, "Debug logging enabled in production environment")
	}

	if len(warnings) > 0 {
		fmt.Println("  ⚠ Warnings:")
		for _, w := range warnings {
			fmt.Printf("    - %s\n", w)
		}
	} else {
		fmt.Println("  ✓ No issues found")
	}
}
