package cli

import (
	"fmt"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"

	"github.com/ofkm/arcane-backend/internal/config"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Show current configuration",
	Long:  `Display the current Arcane configuration settings.`,
	Run: func(cmd *cobra.Command, args []string) {
		_ = godotenv.Load()
		cfg := config.Load()

		fmt.Println("Arcane Configuration:")
		fmt.Println("====================")
		fmt.Printf("App URL:           %s\n", cfg.AppUrl)
		fmt.Printf("Port:              %s\n", cfg.Port)
		fmt.Printf("Database URL:      %s\n", cfg.DatabaseURL)
		fmt.Printf("Docker Host:       %s\n", cfg.DockerHost)
		fmt.Printf("Agent Mode:        %t\n", cfg.AgentMode)
		fmt.Printf("OIDC Enabled:      %t\n", cfg.OidcEnabled)
		fmt.Printf("Environment:       %s\n", cfg.Environment)
		fmt.Printf("Log Level:         %s\n", cfg.LogLevel)
		fmt.Printf("Log JSON:          %t\n", cfg.LogJson)
	},
}

func init() {
	rootCmd.AddCommand(configCmd)
}
