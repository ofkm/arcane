package dto

type CustomizationMeta struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Type        string   `json:"type"`
	Keywords    []string `json:"keywords,omitempty"`
	Description string   `json:"description,omitempty"`
}

type CustomizeCategory struct {
	ID                     string              `json:"id"`
	Title                  string              `json:"title"`
	Description            string              `json:"description"`
	Icon                   string              `json:"icon"`
	URL                    string              `json:"url"`
	Keywords               []string            `json:"keywords"`
	Customizations         []CustomizationMeta `json:"customizations"`
	MatchingCustomizations []CustomizationMeta `json:"matchingCustomizations,omitempty"`
	RelevanceScore         int                 `json:"relevanceScore,omitempty"`
}

type CustomizeSearchRequest struct {
	Query string `json:"query" binding:"required,min=1"`
}

type CustomizeSearchResponse struct {
	Results []CustomizeCategory `json:"results"`
	Query   string              `json:"query"`
	Count   int                 `json:"count"`
}
