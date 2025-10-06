package main

import (
	"context"
	"log"

	"github.com/ofkm/arcane-backend/internal/bootstrap"
)

func main() {
	ctx := context.Background()
	if err := bootstrap.Bootstrap(ctx); err != nil {
		log.Fatalf("Failed to run application: %v", err)
	}
}
