package dto

type CreateContainerDto struct {
	Name          string            `json:"name" binding:"required"`
	Image         string            `json:"image" binding:"required"`
	Command       []string          `json:"command,omitempty"`
	Entrypoint    []string          `json:"entrypoint,omitempty"`
	WorkingDir    string            `json:"workingDir,omitempty"`
	User          string            `json:"user,omitempty"`
	Environment   []string          `json:"environment,omitempty"`
	Ports         map[string]string `json:"ports,omitempty"`   // "80/tcp": "8080"
	Volumes       []string          `json:"volumes,omitempty"` // ["/host/path:/container/path"]
	Networks      []string          `json:"networks,omitempty"`
	RestartPolicy string            `json:"restartPolicy,omitempty"` // "no", "always", "unless-stopped", "on-failure"
	Privileged    bool              `json:"privileged,omitempty"`
	AutoRemove    bool              `json:"autoRemove,omitempty"`
	Memory        int64             `json:"memory,omitempty"` // Memory limit in bytes
	CPUs          float64           `json:"cpus,omitempty"`   // CPU limit
}
