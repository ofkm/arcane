package dto

import "time"

type ImageUpdateResponse struct {
	HasUpdate      bool      `json:"hasUpdate"`
	UpdateType     string    `json:"updateType"`
	CurrentVersion string    `json:"currentVersion"`
	LatestVersion  string    `json:"latestVersion,omitempty"`
	CurrentDigest  string    `json:"currentDigest,omitempty"`
	LatestDigest   string    `json:"latestDigest,omitempty"`
	CheckTime      time.Time `json:"checkTime"`
	ResponseTimeMs int       `json:"responseTimeMs"`
	Error          string    `json:"error,omitempty"`

	AuthMethod     string `json:"authMethod,omitempty"`     // "none" | "anonymous" | "credential" | "unknown"
	AuthUsername   string `json:"authUsername,omitempty"`   // for credential method
	AuthRegistry   string `json:"authRegistry,omitempty"`   // registry host
	UsedCredential bool   `json:"usedCredential,omitempty"` // convenience flag
}

type ImageUpdateSummaryResponse struct {
	TotalImages       int `json:"totalImages"`
	ImagesWithUpdates int `json:"imagesWithUpdates"`
	DigestUpdates     int `json:"digestUpdates"`
	TagUpdates        int `json:"tagUpdates"`
	ErrorsCount       int `json:"errorsCount"`
}

type ImageVersionsResponse struct {
	ImageRef string   `json:"imageRef"`
	Current  string   `json:"current"`
	Versions []string `json:"versions"`
	Latest   string   `json:"latest,omitempty"`
}

type VersionComparisonResponse struct {
	CurrentVersion string `json:"currentVersion"`
	TargetVersion  string `json:"targetVersion"`
	IsNewer        bool   `json:"isNewer"`
	UpdateType     string `json:"updateType"`
	ChangeLevel    string `json:"changeLevel"`
}

type BatchImageUpdateRequest struct {
	ImageRefs   []string                      `json:"imageRefs" binding:"required"`
	Credentials []ContainerRegistryCredential `json:"credentials,omitempty"`
}

type BatchImageUpdateResponse map[string]*ImageUpdateResponse

type CompareVersionRequest struct {
	CurrentVersion string `json:"currentVersion" binding:"required"`
	TargetVersion  string `json:"targetVersion" binding:"required"`
	ImageRef       string `json:"imageRef" binding:"required"`
}
