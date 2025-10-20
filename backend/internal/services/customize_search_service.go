package services

import (
	"reflect"
	"sort"
	"strings"
	"sync"

	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type CustomizeSearchService struct {
	categories []dto.CustomizeCategory
	once       sync.Once
}

func NewCustomizeSearchService() *CustomizeSearchService {
	s := &CustomizeSearchService{}
	s.initCategories()
	return s
}

func (s *CustomizeSearchService) initCategories() {
	s.once.Do(func() {
		s.categories = s.buildCategoriesFromModel()
	})
}

// GetCustomizeCategories returns all available customization categories with their metadata
func (s *CustomizeSearchService) GetCustomizeCategories() []dto.CustomizeCategory {
	return s.categories
}

func (s *CustomizeSearchService) buildCategoriesFromModel() []dto.CustomizeCategory {
	// Basic category metadata (icons and URLs)
	catMeta := map[string]struct {
		ID          string
		Title       string
		Description string
		Icon        string
		URL         string
		Keywords    []string
	}{
		"defaults":   {ID: "defaults", Title: "Defaults", Description: "Configure default templates and settings for new projects", Icon: "file-text", URL: "/customize/defaults", Keywords: []string{"defaults", "templates", "presets", "configuration", "initial"}},
		"templates":  {ID: "templates", Title: "Templates", Description: "Manage project templates and compose file configurations", Icon: "layers", URL: "/customize/templates", Keywords: []string{"templates", "stacks", "compose", "docker-compose", "yaml", "custom"}},
		"registries": {ID: "registries", Title: "Registries", Description: "Configure container registries and authentication", Icon: "package", URL: "/customize/registries", Keywords: []string{"registries", "docker", "images", "authentication", "credentials", "private"}},
		"variables":  {ID: "variables", Title: "Variables", Description: "Manage global variables and environment configuration", Icon: "code", URL: "/customize/variables", Keywords: []string{"variables", "environment", "config", "settings", "secrets", "parameters"}},
	}

	// map category id -> list of customizations
	categories := map[string][]dto.CustomizationMeta{}

	rt := reflect.TypeOf(models.CustomizeItem{})
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
			categoryID = "defaults"
		}

		cm := dto.CustomizationMeta{
			Key:         key,
			Label:       label,
			Type:        typ,
			Description: desc,
			Keywords:    keywords,
		}

		categories[categoryID] = append(categories[categoryID], cm)
	}

	// Build final category list
	result := []dto.CustomizeCategory{}
	for catID, cat := range catMeta {
		customizations := categories[catID]
		if customizations == nil {
			customizations = []dto.CustomizationMeta{}
		}
		result = append(result, dto.CustomizeCategory{
			ID:             cat.ID,
			Title:          cat.Title,
			Description:    cat.Description,
			Icon:           cat.Icon,
			URL:            cat.URL,
			Keywords:       cat.Keywords,
			Customizations: customizations,
		})
	}

	// Sort by ID for consistent ordering
	sort.Slice(result, func(i, j int) bool {
		order := map[string]int{"defaults": 0, "templates": 1, "registries": 2, "variables": 3}
		return order[result[i].ID] < order[result[j].ID]
	})

	return result
}

// Search performs a relevance-scored search across all customization categories and items
func (s *CustomizeSearchService) Search(query string) dto.CustomizeSearchResponse {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return dto.CustomizeSearchResponse{
			Results: []dto.CustomizeCategory{},
			Query:   query,
			Count:   0,
		}
	}

	categories := s.GetCustomizeCategories()
	results := []dto.CustomizeCategory{}

	for _, category := range categories {
		// Check if category matches
		categoryMatch := strings.Contains(strings.ToLower(category.Title), query) ||
			strings.Contains(strings.ToLower(category.Description), query) ||
			containsKeyword(category.Keywords, query)

		// Check individual customizations
		matchingCustomizations := []dto.CustomizationMeta{}
		for _, customization := range category.Customizations {
			if matchesCustomization(customization, query) {
				matchingCustomizations = append(matchingCustomizations, customization)
			}
		}

		if categoryMatch || len(matchingCustomizations) > 0 {
			relevanceScore := calculateCustomizeRelevance(category, matchingCustomizations, query)

			resultCategory := category
			if len(matchingCustomizations) > 0 {
				resultCategory.MatchingCustomizations = matchingCustomizations
			} else {
				resultCategory.MatchingCustomizations = category.Customizations
			}
			resultCategory.RelevanceScore = relevanceScore

			results = append(results, resultCategory)
		}
	}

	// Sort by relevance (highest first)
	sort.Slice(results, func(i, j int) bool {
		return results[i].RelevanceScore > results[j].RelevanceScore
	})

	return dto.CustomizeSearchResponse{
		Results: results,
		Query:   query,
		Count:   len(results),
	}
}

func matchesCustomization(customization dto.CustomizationMeta, query string) bool {
	return strings.Contains(strings.ToLower(customization.Key), query) ||
		strings.Contains(strings.ToLower(customization.Label), query) ||
		strings.Contains(strings.ToLower(customization.Description), query) ||
		containsKeyword(customization.Keywords, query)
}

func calculateCustomizeRelevance(category dto.CustomizeCategory, matchingCustomizations []dto.CustomizationMeta, query string) int {
	score := 0

	// Category-level scoring
	if strings.ToLower(category.Title) == query {
		score += 30
	} else if strings.Contains(strings.ToLower(category.Title), query) {
		score += 20
	}

	if strings.Contains(strings.ToLower(category.Description), query) {
		score += 15
	}

	// Exact keyword match
	for _, keyword := range category.Keywords {
		if strings.ToLower(keyword) == query {
			score += 25
			break
		} else if strings.Contains(strings.ToLower(keyword), query) {
			score += 10
			break
		}
	}

	// Customization-level scoring
	for _, customization := range matchingCustomizations {
		if strings.ToLower(customization.Key) == query {
			score += 30
		} else if strings.Contains(strings.ToLower(customization.Key), query) {
			score += 15
		}

		if strings.Contains(strings.ToLower(customization.Label), query) {
			score += 12
		}

		if strings.Contains(strings.ToLower(customization.Description), query) {
			score += 8
		}

		// Exact keyword match
		for _, keyword := range customization.Keywords {
			if strings.ToLower(keyword) == query {
				score += 20
				break
			} else if strings.Contains(strings.ToLower(keyword), query) {
				score += 5
				break
			}
		}
	}

	return score
}

func containsKeyword(keywords []string, query string) bool {
	for _, keyword := range keywords {
		if strings.Contains(strings.ToLower(keyword), query) {
			return true
		}
	}
	return false
}
