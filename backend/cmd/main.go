package main

import (
	"log"

	"github.com/ofkm/arcane-backend/internal/bootstrap"
)

func main() {
	app, err := bootstrap.InitializeApp()
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	app.Start()
}
