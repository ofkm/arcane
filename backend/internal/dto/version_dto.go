package dto

type VersionInfoDto struct {
	CurrentVersion  string `json:"currentVersion"`
	Revision        string `json:"revision"`
	DisplayVersion  string `json:"displayVersion"`
	IsSemverVersion bool   `json:"isSemverVersion"`
	NewestVersion   string `json:"newestVersion,omitempty"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseURL      string `json:"releaseUrl,omitempty"`
}
