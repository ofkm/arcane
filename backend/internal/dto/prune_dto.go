package dto

type PruneSystemDto struct {
	Containers bool `json:"containers"`
	Images     bool `json:"images"`
	Volumes    bool `json:"volumes"`
	Networks   bool `json:"networks"`
	Dangling   bool `json:"dangling"`
}
