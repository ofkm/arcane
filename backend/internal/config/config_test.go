package config

import (
	"testing"
)

func TestExtractBasePath(t *testing.T) {
	tests := []struct {
		name     string
		appUrl   string
		expected string
	}{
		{
			name:     "URL with single path segment",
			appUrl:   "https://example.com/arcane",
			expected: "/arcane",
		},
		{
			name:     "URL with nested path",
			appUrl:   "https://example.com/apps/arcane",
			expected: "/apps/arcane",
		},
		{
			name:     "URL with trailing slash",
			appUrl:   "https://example.com/arcane/",
			expected: "/arcane",
		},
		{
			name:     "URL without path (root)",
			appUrl:   "https://example.com",
			expected: "",
		},
		{
			name:     "URL with port and path",
			appUrl:   "https://example.com:8080/arcane",
			expected: "/arcane",
		},
		{
			name:     "HTTP URL with path",
			appUrl:   "http://localhost:3552/arcane",
			expected: "/arcane",
		},
		{
			name:     "Empty URL",
			appUrl:   "",
			expected: "",
		},
		{
			name:     "Invalid URL",
			appUrl:   "not a valid url",
			expected: "",
		},
		{
			name:     "URL with only root path",
			appUrl:   "https://example.com/",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractBasePath(tt.appUrl)
			if result != tt.expected {
				t.Errorf("extractBasePath(%q) = %q, want %q", tt.appUrl, result, tt.expected)
			}
		})
	}
}

func TestConfigLoadBasePath(t *testing.T) {
	tests := []struct {
		name             string
		appUrl           string
		expectedAppUrl   string
		expectedBasePath string
	}{
		{
			name:             "Default URL (no base path)",
			appUrl:           "http://localhost:3552",
			expectedAppUrl:   "http://localhost:3552",
			expectedBasePath: "",
		},
		{
			name:             "URL with base path",
			appUrl:           "https://example.com/arcane",
			expectedAppUrl:   "https://example.com/arcane",
			expectedBasePath: "/arcane",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable
			t.Setenv("APP_URL", tt.appUrl)

			// Load config
			cfg := Load()

			if cfg.AppUrl != tt.expectedAppUrl {
				t.Errorf("Config.AppUrl = %q, want %q", cfg.AppUrl, tt.expectedAppUrl)
			}

			if cfg.BasePath != tt.expectedBasePath {
				t.Errorf("Config.BasePath = %q, want %q", cfg.BasePath, tt.expectedBasePath)
			}
		})
	}
}
