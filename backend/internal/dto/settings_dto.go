package dto

type PublicSettingDto struct {
	Key      string `json:"key"`
	Type     string `json:"type"`
	Value    string `json:"value"`
	IsPublic bool   `json:"isPublic"`
}

type SettingDto struct {
	PublicSettingDto
}

type UpdateSettingsDto struct {
	// Core settings
	StacksDirectory    *string `json:"stacksDirectory,omitempty"`
	AutoUpdate         *string `json:"autoUpdate,omitempty"`
	AutoUpdateInterval *string `json:"autoUpdateInterval,omitempty"`
	PollingEnabled     *string `json:"pollingEnabled,omitempty"`
	PollingInterval    *string `json:"pollingInterval,omitempty"`
	PruneMode          *string `json:"pruneMode,omitempty"`
	BaseServerURL      *string `json:"baseServerUrl,omitempty"`

	// Authentication settings
	AuthLocalEnabled   *string `json:"authLocalEnabled,omitempty"`
	AuthOidcEnabled    *string `json:"authOidcEnabled,omitempty"`
	AuthSessionTimeout *string `json:"authSessionTimeout,omitempty"`
	AuthPasswordPolicy *string `json:"authPasswordPolicy,omitempty"`
	AuthRbacEnabled    *string `json:"authRbacEnabled,omitempty"`
	AuthOidcConfig     *string `json:"authOidcConfig,omitempty"`

	// Onboarding settings
	OnboardingCompleted *string `json:"onboardingCompleted,omitempty"`
	OnboardingSteps     *string `json:"onboardingSteps,omitempty"`

	// Registry settings
	RegistryCredentials *string `json:"registryCredentials,omitempty"`
	TemplateRegistries  *string `json:"templateRegistries,omitempty"`
}
