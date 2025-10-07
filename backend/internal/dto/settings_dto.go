package dto

type PublicSettingDto struct {
	Key   string `json:"key"`
	Type  string `json:"type"`
	Value string `json:"value"`
}

type SettingDto struct {
	PublicSettingDto
	IsPublic bool `json:"isPublic"`
}

type UpdateSettingsDto struct {
	// Core settings
	ProjectsDirectory  *string `json:"projectsDirectory,omitempty"`
	DiskUsagePath      *string `json:"diskUsagePath,omitempty"`
	AutoUpdate         *string `json:"autoUpdate,omitempty"`
	AutoUpdateInterval *string `json:"autoUpdateInterval,omitempty"`
	PollingEnabled     *string `json:"pollingEnabled,omitempty"`
	PollingInterval    *string `json:"pollingInterval,omitempty"`
	PruneMode          *string `json:"dockerPruneMode,omitempty" binding:"omitempty,oneof=all dangling"`
	BaseServerURL      *string `json:"baseServerUrl,omitempty"`
	EnableGravatar     *string `json:"enableGravatar,omitempty"`
	DefaultShell       *string `json:"defaultShell,omitempty"`
	DockerHost         *string `json:"dockerHost,omitempty"`

	// Authentication settings
	AuthLocalEnabled   *string `json:"authLocalEnabled,omitempty"`
	AuthOidcEnabled    *string `json:"authOidcEnabled,omitempty"`
	AuthSessionTimeout *string `json:"authSessionTimeout,omitempty"`
	AuthPasswordPolicy *string `json:"authPasswordPolicy,omitempty"`
	AuthOidcConfig     *string `json:"authOidcConfig,omitempty"`

	// Onboarding settings
	OnboardingCompleted *string `json:"onboardingCompleted,omitempty"`
	OnboardingSteps     *string `json:"onboardingSteps,omitempty"`

	// Navigation settings
	MobileNavigationMode         *string `json:"mobileNavigationMode,omitempty"`
	MobileNavigationShowLabels   *string `json:"mobileNavigationShowLabels,omitempty"`
	MobileNavigationScrollToHide *string `json:"mobileNavigationScrollToHide,omitempty"`
	MobileNavigationTapToHide    *string `json:"mobileNavigationTapToHide,omitempty"`
}
