package dto

type DockerInfoDto struct {
	Success           bool   `json:"success"`
	Version           string `json:"version"`
	APIVersion        string `json:"apiVersion"`
	GitCommit         string `json:"gitCommit"`
	GoVersion         string `json:"goVersion"`
	OS                string `json:"os"`
	Arch              string `json:"arch"`
	BuildTime         string `json:"buildTime"`
	Containers        int    `json:"containers"`
	ContainersRunning int    `json:"containersRunning"`
	ContainersPaused  int    `json:"containersPaused"`
	ContainersStopped int    `json:"containersStopped"`
	Images            int    `json:"images"`
	StorageDriver     string `json:"storageDriver"`
	LoggingDriver     string `json:"loggingDriver"`
	CgroupDriver      string `json:"cgroupDriver"`
	CgroupVersion     string `json:"cgroupVersion"`
	KernelVersion     string `json:"kernelVersion"`
	OperatingSystem   string `json:"operatingSystem"`
	OSVersion         string `json:"osVersion"`
	ServerVersion     string `json:"serverVersion"`
	Architecture      string `json:"architecture"`
	CPUs              int    `json:"cpus"`
	MemTotal          int64  `json:"memTotal"`
}
