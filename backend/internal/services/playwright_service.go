//go:build playwright

package services

import (
	"context"
	"fmt"
	"log/slog"
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

	err := ps.settingsService.SetBoolSetting(ctx, "onboardingCompleted", true)
	if err != nil {
		return fmt.Errorf("failed to skip onboarding: %w", err)
	}

	slog.Info("Playwright: Onboarding skipped successfully")
	return nil
}

func (ps *PlaywrightService) ResetOnboarding(ctx context.Context) error {
	slog.Info("Playwright: Resetting onboarding for test environment")

	err := ps.settingsService.SetBoolSetting(ctx, "onboardingCompleted", false)
	if err != nil {
		return fmt.Errorf("failed to skip onboarding: %w", err)
	}

	slog.Info("Playwright: Onboarding reset successfully")
	return nil
}
