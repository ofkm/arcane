package dto

type ImagePullDto struct {
	ImageName string `json:"imageName" binding:"required"`
}

type SetMaturityDto struct {
	Repository       string                 `json:"repository" binding:"required"`
	Tag              string                 `json:"tag" binding:"required"`
	Version          string                 `json:"version" binding:"required"`
	Date             string                 `json:"date"`
	Status           string                 `json:"status" binding:"required"`
	UpdatesAvailable bool                   `json:"updatesAvailable"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}
