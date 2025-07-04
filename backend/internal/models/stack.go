package models

type StackPort struct {
	PublicPort  *int   `json:"publicPort,omitempty"`
	PrivatePort *int   `json:"privatePort,omitempty"`
	Type        string `json:"type"`
}

type StackService struct {
	ID              string             `json:"id"`
	Name            string             `json:"name"`
	State           *StackServiceState `json:"state,omitempty"`
	Ports           []StackPort        `json:"ports,omitempty"`
	NetworkSettings *NetworkSettings   `json:"networkSettings,omitempty"`
}

type StackServiceState struct {
	Running  bool   `json:"running"`
	Status   string `json:"status"`
	ExitCode int    `json:"exitCode"`
}

type NetworkSettings struct {
	Networks map[string]NetworkConfig `json:"networks,omitempty"`
}

type NetworkConfig struct {
	IPAddress  *string `json:"ipAddress,omitempty"`
	Gateway    *string `json:"gateway,omitempty"`
	MacAddress *string `json:"macAddress,omitempty"`
	Driver     *string `json:"driver,omitempty"`
}

type StackStatus string

const (
	StackStatusRunning          StackStatus = "running"
	StackStatusStopped          StackStatus = "stopped"
	StackStatusPartiallyRunning StackStatus = "partially running"
	StackStatusUnknown          StackStatus = "unknown"
	StackStatusDeploying        StackStatus = "deploying"
	StackStatusStopping         StackStatus = "stopping"
	StackStatusRestarting       StackStatus = "restarting"
)

type Stack struct {
	ID           string      `json:"id" gorm:"primaryKey"`
	Name         string      `json:"name" gorm:"not null" sortable:"true"`
	DirName      *string     `json:"dir_name" gorm:"unique"`
	Path         string      `json:"path" gorm:"not null"`
	Status       StackStatus `json:"status" sortable:"true"`
	ServiceCount int         `json:"service_count" sortable:"true"`
	RunningCount int         `json:"running_count" sortable:"true"`
	AutoUpdate   bool        `json:"auto_update" sortable:"true"`
	IsExternal   bool        `json:"is_external"`
	IsLegacy     bool        `json:"is_legacy"`
	IsRemote     bool        `json:"is_remote"`

	BaseModel
}

func (Stack) TableName() string {
	return "stacks_table"
}
