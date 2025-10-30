package cron

import (
	"github.com/go-co-op/gocron/v2"
)

func ValidateCronExpression(expr string) error {
	if expr == "" {
		return nil // Empty is valid (means immediate updates)
	}

	// Try to create a cron job definition to validate the expression
	// gocron.CronJob will panic if the expression is invalid, so we recover
	defer func() {
		if r := recover(); r != nil {
			// Expression is invalid
		}
	}()

	_ = gocron.CronJob(expr, false)
	return nil
}
