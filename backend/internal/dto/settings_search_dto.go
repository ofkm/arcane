package dto

type SettingMeta struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Type        string   `json:"type"`
	Keywords    []string `json:"keywords,omitempty"`
	Description string   `json:"description,omitempty"`
}

type SettingsCategory struct {
	ID               string        `json:"id"`
	Title            string        `json:"title"`
	Description      string        `json:"description"`
	Icon             string        `json:"icon"`
	URL              string        `json:"url"`
	Keywords         []string      `json:"keywords"`
	Settings         []SettingMeta `json:"settings"`
	MatchingSettings []SettingMeta `json:"matchingSettings,omitempty"`
	RelevanceScore   int           `json:"relevanceScore,omitempty"`
}

type SettingsSearchRequest struct {
	Query string `json:"query" binding:"required,min=1"`
}

type SettingsSearchResponse struct {
	Results []SettingsCategory `json:"results"`
	Query   string             `json:"query"`
	Count   int                `json:"count"`
}
