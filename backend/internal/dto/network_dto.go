package dto

import (
	"time"

	"github.com/docker/docker/api/types/network"
)

type NetworkSummaryDto struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Driver    string            `json:"driver"`
	Scope     string            `json:"scope"`
	Created   time.Time         `json:"created"`
	Options   map[string]string `json:"options"`
	Labels    map[string]string `json:"labels"`
	InUse     bool              `json:"inUse"`
	IsDefault bool              `json:"isDefault"`
}

type NetworkUsageCounts struct {
	Inuse  int `json:"networksInuse"`
	Unused int `json:"networksUnused"`
	Total  int `json:"totalNetworks"`
}

type NetworkInspectDto struct {
	ID         string                              `json:"id"`
	Name       string                              `json:"name"`
	Driver     string                              `json:"driver"`
	Scope      string                              `json:"scope"`
	Created    time.Time                           `json:"created"`
	Options    map[string]string                   `json:"options"`
	Labels     map[string]string                   `json:"labels"`
	Containers map[string]network.EndpointResource `json:"containers"`
	IPAM       network.IPAM                        `json:"ipam"`
	Internal   bool                                `json:"internal"`
	Attachable bool                                `json:"attachable"`
	Ingress    bool                                `json:"ingress"`
}

type NetworkCreateResponseDto struct {
	ID      string `json:"id"`
	Warning string `json:"warning,omitempty"`
}

type NetworkPruneReportDto struct {
	NetworksDeleted []string `json:"networksDeleted"`
	SpaceReclaimed  uint64   `json:"spaceReclaimed"`
}

func NewNetworkSummaryDto(s network.Summary) NetworkSummaryDto {
	iu := len(s.Containers) > 0

	return NetworkSummaryDto{
		ID:      s.ID,
		Name:    s.Name,
		Driver:  s.Driver,
		Scope:   s.Scope,
		Created: s.Created,
		Options: s.Options,
		Labels:  s.Labels,
		InUse:   iu,
	}
}
