package services

import (
	"strings"

	"github.com/ofkm/arcane-backend/internal/dto"
)

type SettingsSearchService struct{}

func NewSettingsSearchService() *SettingsSearchService {
	return &SettingsSearchService{}
}

// GetSettingsCategories returns all available settings categories with their metadata
func (s *SettingsSearchService) GetSettingsCategories() []dto.SettingsCategory {
	return []dto.SettingsCategory{
		{
			ID:          "general",
			Title:       "General",
			Description: "Core application settings and configuration",
			Icon:        "settings",
			URL:         "/settings/general",
			Keywords:    []string{"general", "core", "basic", "main"},
			Settings: []dto.SettingMeta{
				{
					Key:         "projectsDirectory",
					Label:       "Projects Directory",
					Type:        "text",
					Description: "Configure where project files are stored",
					Keywords:    []string{"projects", "directory", "path", "folder", "location", "storage", "files", "compose", "docker-compose"},
				},
				{
					Key:         "baseServerUrl",
					Label:       "Base Server URL",
					Type:        "text",
					Description: "Set the base URL for the application",
					Keywords:    []string{"base", "url", "server", "domain", "host", "endpoint", "address", "link"},
				},
				{
					Key:         "enableGravatar",
					Label:       "Enable Gravatar",
					Type:        "boolean",
					Description: "Enable Gravatar profile pictures for users",
					Keywords:    []string{"gravatar", "avatar", "profile", "picture", "image", "user", "photo"},
				},
			},
		},
		{
			ID:          "docker",
			Title:       "Docker",
			Description: "Configure Docker settings, polling, and auto-updates",
			Icon:        "database",
			URL:         "/settings/docker",
			Keywords:    []string{"docker", "container", "image"},
			Settings: []dto.SettingMeta{
				{
					Key:         "pollingEnabled",
					Label:       "Enable Polling",
					Type:        "boolean",
					Description: "Enable automatic checking for image updates",
					Keywords:    []string{"polling", "check", "monitor", "watch", "scan", "detection", "automatic"},
				},
				{
					Key:         "pollingInterval",
					Label:       "Polling Interval",
					Type:        "number",
					Description: "How often to check for image updates",
					Keywords:    []string{"interval", "frequency", "schedule", "time", "minutes", "period", "delay"},
				},
				{
					Key:         "autoUpdate",
					Label:       "Auto Update",
					Type:        "boolean",
					Description: "Automatically update containers when new images are available",
					Keywords:    []string{"auto", "update", "automatic", "upgrade", "refresh", "restart", "deploy"},
				},
				{
					Key:         "autoUpdateInterval",
					Label:       "Auto Update Interval",
					Type:        "number",
					Description: "Interval between automatic updates",
					Keywords:    []string{"auto", "update", "interval", "frequency", "schedule", "automatic", "timing"},
				},
				{
					Key:         "dockerPruneMode",
					Label:       "Docker Prune Action",
					Type:        "select",
					Description: "Configure how unused Docker images are cleaned up",
					Keywords:    []string{"prune", "cleanup", "clean", "remove", "delete", "unused", "dangling", "space", "disk"},
				},
			},
		},
		{
			ID:          "security",
			Title:       "Security",
			Description: "Manage authentication and security settings",
			Icon:        "shield",
			URL:         "/settings/security",
			Keywords:    []string{"security", "safety", "protection"},
			Settings: []dto.SettingMeta{
				{
					Key:         "authLocalEnabled",
					Label:       "Local Authentication",
					Type:        "boolean",
					Description: "Enable local username/password authentication",
					Keywords:    []string{"local", "auth", "authentication", "username", "password", "login", "credentials"},
				},
				{
					Key:         "authOidcEnabled",
					Label:       "OIDC Authentication",
					Type:        "boolean",
					Description: "Enable OpenID Connect (OIDC) authentication",
					Keywords:    []string{"oidc", "openid", "connect", "sso", "oauth", "external", "provider", "federation"},
				},
				{
					Key:         "authSessionTimeout",
					Label:       "Session Timeout",
					Type:        "number",
					Description: "How long user sessions remain active",
					Keywords:    []string{"session", "timeout", "expire", "duration", "lifetime", "minutes", "logout"},
				},
				{
					Key:         "authPasswordPolicy",
					Label:       "Password Policy",
					Type:        "select",
					Description: "Set password strength requirements",
					Keywords:    []string{"password", "policy", "strength", "complexity", "requirements", "security", "rules"},
				},
			},
		},
		{
			ID:          "navigation",
			Title:       "Navigation",
			Description: "Customize navigation and interface behavior",
			Icon:        "navigation",
			URL:         "/settings/navigation",
			Keywords:    []string{"navigation", "nav", "menu", "bar", "floating", "docked", "behavior", "mobile", "desktop", "ui", "interface", "layout", "appearance", "customize"},
			Settings: []dto.SettingMeta{
				{
					Key:         "sidebarHoverExpansion",
					Label:       "Sidebar Hover Expansion",
					Type:        "boolean",
					Description: "Expand sidebar on hover in desktop mode",
					Keywords:    []string{"sidebar", "hover", "expansion", "expand", "desktop", "mouse", "over", "collapsed", "collapsible", "icon", "labels", "text", "preview", "peek", "tooltip", "overlay", "temporary", "quick", "access", "navigation", "menu", "items", "submenu", "nested"},
				},
				{
					Key:         "mobileNavigationMode",
					Label:       "Mobile Navigation Mode",
					Type:        "select",
					Description: "Choose between floating or docked navigation on mobile",
					Keywords:    []string{"mode", "style", "type", "floating", "docked", "position", "layout", "design", "appearance", "bottom"},
				},
				{
					Key:         "mobileNavigationShowLabels",
					Label:       "Show Navigation Labels",
					Type:        "boolean",
					Description: "Display text labels alongside navigation icons",
					Keywords:    []string{"labels", "text", "icons", "display", "show", "hide", "names", "captions", "titles", "visible", "toggle"},
				},
				{
					Key:         "mobileNavigationScrollToHide",
					Label:       "Scroll to Hide",
					Type:        "boolean",
					Description: "Automatically hide navigation when scrolling down",
					Keywords:    []string{"scroll", "hide", "auto-hide", "behavior", "down", "up", "automatic", "disappear", "vanish", "minimize", "collapse"},
				},
				{
					Key:         "glassEffectEnabled",
					Label:       "Glass Effect",
					Type:        "boolean",
					Description: "Enable modern glassmorphism design with blur, gradients, and ambient effects",
					Keywords:    []string{"glass", "glassmorphism", "blur", "backdrop", "frosted", "effect", "gradient", "ambient", "design", "ui", "appearance", "modern", "visual", "style", "theme", "transparency", "translucent"},
				},
			},
		},
		{
			ID:          "users",
			Title:       "Users",
			Description: "Manage users and access control",
			Icon:        "user",
			URL:         "/settings/users",
			Keywords:    []string{"users", "accounts", "admin", "roles", "management", "people"},
			Settings:    []dto.SettingMeta{},
		},
	}
}

// Search performs a relevance-scored search across settings categories and individual settings
func (s *SettingsSearchService) Search(query string) dto.SettingsSearchResponse {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return dto.SettingsSearchResponse{
			Results: []dto.SettingsCategory{},
			Query:   query,
			Count:   0,
		}
	}

	categories := s.GetSettingsCategories()
	var results []dto.SettingsCategory

	for _, category := range categories {
		// Check if category matches
		categoryMatch := s.categoryMatches(category, query)

		// Check individual settings with enhanced matching
		matchingSettings := s.findMatchingSettings(category.Settings, query)

		if categoryMatch || len(matchingSettings) > 0 {
			// Calculate relevance score based on match quality
			relevanceScore := s.calculateRelevance(category, matchingSettings, query)

			categoryResult := dto.SettingsCategory{
				ID:             category.ID,
				Title:          category.Title,
				Description:    category.Description,
				Icon:           category.Icon,
				URL:            category.URL,
				Keywords:       category.Keywords,
				Settings:       category.Settings,
				RelevanceScore: relevanceScore,
			}

			if len(matchingSettings) > 0 {
				categoryResult.MatchingSettings = matchingSettings
			} else {
				categoryResult.MatchingSettings = category.Settings
			}

			results = append(results, categoryResult)
		}
	}

	// Sort by relevance (highest first)
	s.sortByRelevance(results)

	return dto.SettingsSearchResponse{
		Results: results,
		Query:   query,
		Count:   len(results),
	}
}

func (s *SettingsSearchService) categoryMatches(category dto.SettingsCategory, query string) bool {
	if strings.Contains(strings.ToLower(category.Title), query) {
		return true
	}
	if strings.Contains(strings.ToLower(category.Description), query) {
		return true
	}
	for _, keyword := range category.Keywords {
		if strings.Contains(strings.ToLower(keyword), query) {
			return true
		}
	}
	return false
}

func (s *SettingsSearchService) findMatchingSettings(settings []dto.SettingMeta, query string) []dto.SettingMeta {
	var matching []dto.SettingMeta
	for _, setting := range settings {
		if s.settingMatches(setting, query) {
			matching = append(matching, setting)
		}
	}
	return matching
}

func (s *SettingsSearchService) settingMatches(setting dto.SettingMeta, query string) bool {
	if strings.Contains(strings.ToLower(setting.Key), query) {
		return true
	}
	if strings.Contains(strings.ToLower(setting.Label), query) {
		return true
	}
	if strings.Contains(strings.ToLower(setting.Description), query) {
		return true
	}
	for _, keyword := range setting.Keywords {
		if strings.Contains(strings.ToLower(keyword), query) {
			return true
		}
	}
	return false
}

func (s *SettingsSearchService) calculateRelevance(category dto.SettingsCategory, matchingSettings []dto.SettingMeta, query string) int {
	score := 0

	// Category title/description match gets high score
	if strings.Contains(strings.ToLower(category.Title), query) {
		score += 20
	}
	if strings.Contains(strings.ToLower(category.Description), query) {
		score += 15
	}

	// Exact keyword match
	for _, keyword := range category.Keywords {
		if strings.ToLower(keyword) == query {
			score += 25
		} else if strings.Contains(strings.ToLower(keyword), query) {
			score += 10
		}
	}

	// Add score for individual setting matches
	for _, setting := range matchingSettings {
		if strings.ToLower(setting.Key) == query {
			score += 30
		} else if strings.Contains(strings.ToLower(setting.Key), query) {
			score += 15
		}

		if strings.Contains(strings.ToLower(setting.Label), query) {
			score += 12
		}
		if strings.Contains(strings.ToLower(setting.Description), query) {
			score += 8
		}

		for _, keyword := range setting.Keywords {
			if strings.ToLower(keyword) == query {
				score += 20
			} else if strings.Contains(strings.ToLower(keyword), query) {
				score += 5
			}
		}
	}

	return score
}

func (s *SettingsSearchService) sortByRelevance(results []dto.SettingsCategory) {
	// Bubble sort by relevance score (descending)
	for i := 0; i < len(results)-1; i++ {
		for j := 0; j < len(results)-i-1; j++ {
			if results[j].RelevanceScore < results[j+1].RelevanceScore {
				results[j], results[j+1] = results[j+1], results[j]
			}
		}
	}
}
