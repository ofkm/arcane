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
	ID             string      `json:"id" gorm:"primaryKey;type:text"`
	Name           string      `json:"name" gorm:"uniqueIndex;not null"`
	DirName        *string     `json:"dirName,omitempty" gorm:"column:dir_name"`
	Path           string      `json:"path" gorm:"not null"`
	AutoUpdate     bool        `json:"autoUpdate" gorm:"column:auto_update;default:false"`
	IsExternal     bool        `json:"isExternal" gorm:"column:is_external;default:false"`
	IsLegacy       bool        `json:"isLegacy" gorm:"column:is_legacy;default:false"`
	IsRemote       bool        `json:"isRemote" gorm:"column:is_remote;default:false"`
	AgentID        *string     `json:"agentId,omitempty" gorm:"column:agent_id"`
	AgentHostname  *string     `json:"agentHostname,omitempty" gorm:"column:agent_hostname"`
	Status         StackStatus `json:"status" gorm:"default:'unknown'"`
	ServiceCount   int         `json:"serviceCount" gorm:"column:service_count;default:0"`
	RunningCount   int         `json:"runningCount" gorm:"column:running_count;default:0"`
	ComposeContent *string     `json:"composeContent,omitempty" gorm:"column:compose_content;type:text"`
	EnvContent     *string     `json:"envContent,omitempty" gorm:"column:env_content;type:text"`
	LastPolled     *int64      `json:"lastPolled,omitempty" gorm:"column:last_polled"`

	// Relationships
	Agent *Agent `json:"agent,omitempty" gorm:"foreignKey:AgentID;references:ID"`

	BaseModel
}

func (Stack) TableName() string {
	return "stacks_table"
}
