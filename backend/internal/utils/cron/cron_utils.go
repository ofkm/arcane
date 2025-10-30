package cron

import (
	"fmt"

	"github.com/go-co-op/gocron/v2"
)

func ValidateCronExpression(expr string) (err error) {
	if expr == "" {
		return nil // Empty is valid (means immediate updates)
	}

	// Try to create a cron job definition to validate the expression
	// gocron.CronJob will panic if the expression is invalid, so we recover
	defer func() {
		if r := recover(); r != nil {
			// Expression is invalid - convert panic to error
			err = fmt.Errorf("invalid cron expression: %v", r)
		}
	}()

	_ = gocron.CronJob(expr, false)
	return nil
}
