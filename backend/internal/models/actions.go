package models

type StackAction string

const (
	StackActionStart    StackAction = "start"
	StackActionStop     StackAction = "stop"
	StackActionRestart  StackAction = "restart"
	StackActionRedeploy StackAction = "redeploy"
	StackActionImport   StackAction = "import"
	StackActionDestroy  StackAction = "destroy"
	StackActionPull     StackAction = "pull"
	StackActionMigrate  StackAction = "migrate"
)

type ContainerAction string

const (
	ContainerActionStart   ContainerAction = "start"
	ContainerActionStop    ContainerAction = "stop"
	ContainerActionRestart ContainerAction = "restart"
	ContainerActionPull    ContainerAction = "pull"
	ContainerActionRemove  ContainerAction = "remove"
)

type PruneType string

const (
	PruneTypeContainers PruneType = "containers"
	PruneTypeImages     PruneType = "images"
	PruneTypeNetworks   PruneType = "networks"
	PruneTypeVolumes    PruneType = "volumes"
)

type LoadingStates struct {
	Start      *bool `json:"start,omitempty"`
	Stop       *bool `json:"stop,omitempty"`
	Restart    *bool `json:"restart,omitempty"`
	Pull       *bool `json:"pull,omitempty"`
	Deploy     *bool `json:"deploy,omitempty"`
	Redeploy   *bool `json:"redeploy,omitempty"`
	Remove     *bool `json:"remove,omitempty"`
	Validating *bool `json:"validating,omitempty"`
}

type PruneResult struct {
	ContainersDeleted []string `json:"containersDeleted,omitempty"`
	ImagesDeleted     []any    `json:"imagesDeleted,omitempty"`
	NetworksDeleted   []string `json:"networksDeleted,omitempty"`
	VolumesDeleted    []string `json:"volumesDeleted,omitempty"`
	SpaceReclaimed    int64    `json:"spaceReclaimed,omitempty"`
}
