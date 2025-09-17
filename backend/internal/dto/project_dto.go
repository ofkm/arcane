package dto

type CreateProjectDto struct {
	Name           string  `json:"name" binding:"required"`
	ComposeContent string  `json:"composeContent" binding:"required"`
	EnvContent     *string `json:"envContent,omitempty"`
}

type CreateProjectReponseDto struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DirName      string `json:"dirName,omitempty"`
	Path         string `json:"path"`
	Status       string `json:"status"`
	ServiceCount int    `json:"serviceCount"`
	RunningCount int    `json:"runningCount"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type ProjectDetailsDto struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	DirName        string `json:"dirName,omitempty"`
	Path           string `json:"path"`
	ComposeContent string `json:"composeContent,omitempty"`
	EnvContent     string `json:"envContent,omitempty"`
	Status         string `json:"status"`
	ServiceCount   int    `json:"serviceCount"`
	RunningCount   int    `json:"runningCount"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
	Services       []any  `json:"services,omitempty"`
}
