package dto

type AutoUpdateCheckDto struct {
	Type        string   `json:"type,omitempty"`        // "containers", "stacks", or "all"
	ResourceIds []string `json:"resourceIds,omitempty"` // Specific resources to check
	ForceUpdate bool     `json:"forceUpdate,omitempty"` // Force update even if no changes
	DryRun      bool     `json:"dryRun,omitempty"`      // Check only, don't apply updates
}

type AutoUpdateResultDto struct {
	Success   bool                       `json:"success"`
	Checked   int                        `json:"checked"`
	Updated   int                        `json:"updated"`
	Skipped   int                        `json:"skipped"`
	Failed    int                        `json:"failed"`
	StartTime string                     `json:"startTime"`
	EndTime   string                     `json:"endTime"`
	Duration  string                     `json:"duration"`
	Results   []AutoUpdateResourceResult `json:"results"`
}

type AutoUpdateResourceResult struct {
	ResourceID      string                 `json:"resourceId"`
	ResourceName    string                 `json:"resourceName"`
	ResourceType    string                 `json:"resourceType"`
	Status          string                 `json:"status"`
	UpdateAvailable bool                   `json:"updateAvailable"`
	UpdateApplied   bool                   `json:"updateApplied"`
	OldImages       map[string]string      `json:"oldImages,omitempty"`
	NewImages       map[string]string      `json:"newImages,omitempty"`
	Error           string                 `json:"error,omitempty"`
	Details         map[string]interface{} `json:"details,omitempty"`
}

type AutoUpdateConfigDto struct {
	Enabled            bool     `json:"enabled"`
	CheckInterval      int      `json:"checkInterval"` // minutes
	IncludeContainers  bool     `json:"includeContainers"`
	IncludeStacks      bool     `json:"includeStacks"`
	AutoApplyUpdates   bool     `json:"autoApplyUpdates"`
	ExcludedImages     []string `json:"excludedImages,omitempty"`
	ExcludedContainers []string `json:"excludedContainers,omitempty"`
	ExcludedStacks     []string `json:"excludedStacks,omitempty"`
}
