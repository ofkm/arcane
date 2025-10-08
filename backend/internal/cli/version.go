package cli

import (
	"fmt"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/spf13/cobra"
)

func init() {
	rootCmd.AddCommand(&cobra.Command{
		Use:   "version",
		Short: "Arcane version information",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("arcane " + config.Version + " revision " + config.Revision)
		},
	})
}
