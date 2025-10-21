package generate

import (
	"github.com/spf13/cobra"
)

var GenerateCmd = &cobra.Command{
	Use:     "generate",
	Aliases: []string{"gen", "g"},
	Short:   "Generate configuration files and templates",
	Long:    `Generate various configuration files, Docker Compose templates, and other resources.`,
}
