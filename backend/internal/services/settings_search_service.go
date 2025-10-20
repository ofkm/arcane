package services

import (
	"reflect"
	"sort"
	"strings"
	"sync"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type SettingsSearchService struct {
	categories []dto.SettingsCategory
	once       sync.Once
}

func NewSettingsSearchService() *SettingsSearchService {
	s := &SettingsSearchService{}
	s.initCategories()
	return s
}

func (s *SettingsSearchService) initCategories() {
	s.once.Do(func() {
		s.categories = s.buildCategoriesFromModel()
	})
}

// GetSettingsCategories returns all available settings categories with their metadata
func (s *SettingsSearchService) GetSettingsCategories() []dto.SettingsCategory {
	return s.categories
}

func (s *SettingsSearchService) buildCategoriesFromModel() []dto.SettingsCategory {
	// Basic category metadata (fallbacks)
	catMeta := map[string]dto.SettingsCategory{
		"general":    {ID: "general", Title: "General", Description: "Core application settings and configuration", Icon: "settings", URL: "/settings/general", Keywords: []string{"general", "core", "basic", "main"}},
		"docker":     {ID: "docker", Title: "Docker", Description: "Configure Docker settings, polling, and auto-updates", Icon: "database", URL: "/settings/docker", Keywords: []string{"docker", "container", "image"}},
		"security":   {ID: "security", Title: "Security", Description: "Manage authentication and security settings", Icon: "shield", URL: "/settings/security", Keywords: []string{"security", "safety", "protection"}},
		"navigation": {ID: "navigation", Title: "Navigation", Description: "Customize navigation and interface behavior", Icon: "navigation", URL: "/settings/navigation", Keywords: []string{"navigation", "nav", "menu", "bar"}},
		"users":      {ID: "users", Title: "Users", Description: "Manage users and access control", Icon: "user", URL: "/settings/users", Keywords: []string{"users", "accounts", "admin", "roles"}},
	}

	// map category id -> list of settings
	categories := map[string][]dto.SettingMeta{}

	rt := reflect.TypeOf(models.Settings{})
	for i := 0; i < rt.NumField(); i++ {
		field := rt.Field(i)
		keyTag := field.Tag.Get("key")
		key, _, _ := strings.Cut(keyTag, ",")
		if key == "" {
			continue
		}

		meta := utils.ParseMetaTag(field.Tag.Get("meta"))
		label := meta["label"]
		if label == "" {
			label = key
		}
		typ := meta["type"]
		if typ == "" {
			typ = "text"
		}
		desc := meta["description"]
		keywords := utils.ParseKeywords(meta["keywords"])
		categoryID := meta["category"]
		if categoryID == "" {
			categoryID = "general"
		}

		sm := dto.SettingMeta{
			Key:         key,
			Label:       label,
			Type:        typ,
			Description: desc,
			Keywords:    keywords,
		}

		categories[categoryID] = append(categories[categoryID], sm)
	}

	// Build result slice in deterministic order
	ids := make([]string, 0, len(categories))
	for id := range categories {
		// Skip internal category - should not be shown in UI
		if id == "internal" {
			continue
		}
		ids = append(ids, id)
	}
	sort.Strings(ids)

	var results []dto.SettingsCategory
	for _, id := range ids {
		cat := catMeta[id]
		// If we don't have a default for this category, create a basic one
		if cat.ID == "" {
			cat = dto.SettingsCategory{ID: id, Title: cases.Title(language.Und).String(id), Description: "", Icon: "settings", URL: "/settings/" + id}
		}
		cat.Settings = categories[id]
		results = append(results, cat)
	}

	return results
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
	sort.Slice(results, func(i, j int) bool {
		return results[i].RelevanceScore > results[j].RelevanceScore
	})
}
