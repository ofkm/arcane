//go:build playwright

package services

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/ofkm/arcane-backend/internal/models"
)

type PlaywrightService struct {
	settingsService *SettingsService
}

func NewPlaywrightService(settingsService *SettingsService) *PlaywrightService {
	return &PlaywrightService{
		settingsService: settingsService,
	}
}

func (ps *PlaywrightService) SkipOnboarding(ctx context.Context) error {
	slog.Info("Playwright: Skipping onboarding for test environment")

	settings, err := ps.settingsService.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get settings: %w", err)
	}

	// Update onboarding to completed
	settings.Onboarding = models.JSON{
		"completed": true,
	}

	if _, err := ps.settingsService.UpdateSettings(ctx, settings); err != nil {
		return fmt.Errorf("failed to skip onboarding: %w", err)
	}

	slog.Info("Playwright: Onboarding skipped successfully")
	return nil
}

func (ps *PlaywrightService) ResetOnboarding(ctx context.Context) error {
	slog.Info("Playwright: Resetting onboarding for test environment")

	settings, err := ps.settingsService.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get settings: %w", err)
	}

	// Reset onboarding to not completed
	settings.Onboarding = models.JSON{
		"completed": false,
	}

	if _, err := ps.settingsService.UpdateSettings(ctx, settings); err != nil {
		return fmt.Errorf("failed to reset onboarding: %w", err)
	}

	slog.Info("Playwright: Onboarding reset successfully")
	return nil
}
