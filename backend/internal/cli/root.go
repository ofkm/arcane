package cli

import (
	"context"
	"log/slog"
	"os"

	"github.com/spf13/cobra"

	"github.com/ofkm/arcane-backend/internal/bootstrap"
	"github.com/ofkm/arcane-backend/internal/cli/generate"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/utils/signals"
)

var (
	cfgFile string
	verbose bool
)

var rootCmd = &cobra.Command{
	Use: "arcane",
	Long: `Arcane - Modern Docker Management, Designed for Everyone. 
	By default, this command starts the Arcane server.`,
	Version: getVersion(),
	Run: func(cmd *cobra.Command, args []string) {
		err := bootstrap.Bootstrap(cmd.Context())
		if err != nil {
			slog.Error("Failed to run Arcane", "error", err)
			os.Exit(1)
		}
	},
}

func Execute() {
	ctx := signals.SignalContext(context.Background())

	err := rootCmd.ExecuteContext(ctx)
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is .env)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "enable verbose output")

	rootCmd.AddCommand(generate.GenerateCmd)
}

func getVersion() string {
	return config.Version
}
