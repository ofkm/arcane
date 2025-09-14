package cli

import (
	"github.com/ofkm/arcane-backend/internal/bootstrap"
	"github.com/spf13/cobra"
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start Arcane",
	RunE: func(cmd *cobra.Command, args []string) error {
		app, err := bootstrap.InitializeApp()
		if err != nil {
			return err
		}
		app.Start()
		return nil
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
}
