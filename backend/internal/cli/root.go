package cli

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/ofkm/arcane-backend/internal/bootstrap"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "arcane",
	Short: "Modern Docker Management, Designed for Everyone",
	Long:  `The default use of this command is to run the arcane application.`,
	Run: func(cmd *cobra.Command, args []string) {
		ctx := cmd.Context()
		if err := bootstrap.Bootstrap(ctx); err != nil {
			log.Printf("Failed to run arcane: %v", err)
			os.Exit(1)
		}
	},
}

func Execute() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		cancel()
	}()
	if err := rootCmd.ExecuteContext(ctx); err != nil {
		log.Printf("Error: %v", err)
		os.Exit(1)
	}
}
