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
)

type Stack struct {
	ID           string      `json:"id" gorm:"primaryKey"`
	Name         string      `json:"name" gorm:"not null"`
	DirName      *string     `json:"dir_name" gorm:"unique"`
	Path         string      `json:"path" gorm:"not null"`
	Status       StackStatus `json:"status"`
	ServiceCount int         `json:"service_count"`
	RunningCount int         `json:"running_count"`
	AutoUpdate   bool        `json:"auto_update"`
	IsExternal   bool        `json:"is_external"`
	IsLegacy     bool        `json:"is_legacy"`
	IsRemote     bool        `json:"is_remote"`

	AgentID *string `json:"agent_id,omitempty" gorm:"index"`
	Agent   *Agent  `json:"agent,omitempty" gorm:"foreignKey:AgentID"`

	BaseModel
}

func (Stack) TableName() string {
	return "stacks_table"
}
