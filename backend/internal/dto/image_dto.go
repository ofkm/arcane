package dto

import (
	"strings"
	"time"

	"github.com/docker/docker/api/types/image"
)

type ImagePullDto struct {
	ImageName   string                        `json:"imageName" binding:"required"`
	Credentials []ContainerRegistryCredential `json:"credentials,omitempty"`
}

type ImageUpdateInfoDto struct {
	HasUpdate      bool      `json:"hasUpdate"`
	UpdateType     string    `json:"updateType"`
	CurrentVersion string    `json:"currentVersion"`
	LatestVersion  string    `json:"latestVersion"`
	CurrentDigest  string    `json:"currentDigest"`
	LatestDigest   string    `json:"latestDigest"`
	CheckTime      time.Time `json:"checkTime"`
	ResponseTimeMs int       `json:"responseTimeMs"`
	Error          string    `json:"error"`

	AuthMethod     string `json:"authMethod,omitempty"`
	AuthUsername   string `json:"authUsername,omitempty"`
	AuthRegistry   string `json:"authRegistry,omitempty"`
	UsedCredential bool   `json:"usedCredential,omitempty"`
}

type ImageUsageCountsDto struct {
	Inuse     int   `json:"imagesInuse"`
	Unused    int   `json:"imagesUnused"`
	Total     int   `json:"totalImages"`
	TotalSize int64 `json:"totalImageSize"`
}

type ImageSummaryDto struct {
	ID          string                 `json:"id" sortable:"true"`
	RepoTags    []string               `json:"repoTags"`
	RepoDigests []string               `json:"repoDigests"`
	Created     int64                  `json:"created" sortable:"true"`
	Size        int64                  `json:"size" sortable:"true"`
	VirtualSize int64                  `json:"virtualSize"`
	Labels      map[string]interface{} `json:"labels"`
	InUse       bool                   `json:"inUse" sortable:"true"`
	Repo        string                 `json:"repo" sortable:"true"`
	Tag         string                 `json:"tag" sortable:"true"`
	UpdateInfo  *ImageUpdateInfoDto    `json:"updateInfo,omitempty"`
}

type ImageDetailSummaryDto struct {
	Id            string   `json:"id"`
	RepoTags      []string `json:"repoTags"`
	RepoDigests   []string `json:"repoDigests"`
	Parent        string   `json:"parent"`
	Comment       string   `json:"comment"`
	Created       string   `json:"created"`
	DockerVersion string   `json:"dockerVersion"`
	Author        string   `json:"author"`
	Config        struct {
		ExposedPorts map[string]struct{} `json:"exposedPorts,omitempty"`
		Env          []string            `json:"env,omitempty"`
		Cmd          []string            `json:"cmd,omitempty"`
		Volumes      map[string]struct{} `json:"volumes,omitempty"`
		WorkingDir   string              `json:"workingDir,omitempty"`
		ArgsEscaped  bool                `json:"argsEscaped,omitempty"`
	} `json:"config"`
	Architecture string `json:"architecture"`
	Os           string `json:"os"`
	Size         int64  `json:"size"`
	GraphDriver  struct {
		Data any    `json:"data"`
		Name string `json:"name"`
	} `json:"graphDriver"`
	RootFs struct {
		Type   string   `json:"type"`
		Layers []string `json:"layers"`
	} `json:"rootFs"`
	Metadata struct {
		LastTagTime string `json:"lastTagTime"`
	} `json:"metadata"`
	Descriptor struct {
		MediaType string `json:"mediaType"`
		Digest    string `json:"digest"`
		Size      int64  `json:"size"`
	} `json:"descriptor"`
}

func NewImageDetailSummaryDto(src *image.InspectResponse) ImageDetailSummaryDto {
	var out ImageDetailSummaryDto

	out.Id = src.ID
	out.RepoTags = append(out.RepoTags, src.RepoTags...)
	out.RepoDigests = append(out.RepoDigests, src.RepoDigests...)
	out.Parent = src.Parent
	out.Comment = src.Comment
	out.Created = src.Created
	out.DockerVersion = src.DockerVersion
	out.Author = src.Author

	if src.Config != nil {
		if len(src.Config.ExposedPorts) > 0 {
			out.Config.ExposedPorts = make(map[string]struct{}, len(src.Config.ExposedPorts))
			for p := range src.Config.ExposedPorts {
				out.Config.ExposedPorts[string(p)] = struct{}{}
			}
		}
		if len(src.Config.Env) > 0 {
			out.Config.Env = append(out.Config.Env, src.Config.Env...)
		}
		if len(src.Config.Cmd) > 0 {
			out.Config.Cmd = append(out.Config.Cmd, src.Config.Cmd...)
		}
		if len(src.Config.Volumes) > 0 {
			out.Config.Volumes = make(map[string]struct{}, len(src.Config.Volumes))
			for v := range src.Config.Volumes {
				out.Config.Volumes[v] = struct{}{}
			}
		}
		out.Config.WorkingDir = src.Config.WorkingDir
	}

	out.Architecture = src.Architecture
	out.Os = src.Os
	out.Size = src.Size

	out.GraphDriver.Name = src.GraphDriver.Name
	if src.GraphDriver.Data != nil {
		out.GraphDriver.Data = src.GraphDriver.Data
	}

	out.RootFs.Type = src.RootFS.Type
	if len(src.RootFS.Layers) > 0 {
		out.RootFs.Layers = append(out.RootFs.Layers, src.RootFS.Layers...)
	}

	if !src.Metadata.LastTagTime.IsZero() {
		out.Metadata.LastTagTime = src.Metadata.LastTagTime.Format(time.RFC3339Nano)
	}

	// Best-effort descriptor from first digest
	out.Descriptor.MediaType = "application/vnd.oci.image.index.v1+json"
	if len(src.RepoDigests) > 0 {
		parts := strings.SplitN(src.RepoDigests[0], "@", 2)
		if len(parts) == 2 {
			out.Descriptor.Digest = parts[1]
		}
	}

	return out
}

type ImageInspectDto struct {
	ID           string   `json:"id"`
	RepoTags     []string `json:"repoTags"`
	RepoDigests  []string `json:"repoDigests"`
	Size         int64    `json:"size"`
	Created      string   `json:"created"`
	OS           string   `json:"os"`
	Architecture string   `json:"architecture"`
	Author       string   `json:"author"`
	Comment      string   `json:"comment"`
}

type ImageHistoryItemDto struct {
	ID        string   `json:"id"`
	Created   int64    `json:"created"`
	CreatedBy string   `json:"createdBy"`
	Tags      []string `json:"tags"`
	Size      int64    `json:"size"`
	Comment   string   `json:"comment"`
}

type ImagePruneReportDto struct {
	ImagesDeleted  []string `json:"imagesDeleted"`
	SpaceReclaimed uint64   `json:"spaceReclaimed"`
}

func NewImagePruneReportDto(src image.PruneReport) ImagePruneReportDto {
	out := ImagePruneReportDto{
		ImagesDeleted:  make([]string, 0, len(src.ImagesDeleted)),
		SpaceReclaimed: src.SpaceReclaimed,
	}
	for _, d := range src.ImagesDeleted {
		if d.Deleted != "" {
			out.ImagesDeleted = append(out.ImagesDeleted, d.Deleted)
		} else if d.Untagged != "" {
			out.ImagesDeleted = append(out.ImagesDeleted, d.Untagged)
		}
	}
	return out
}

type MessageDto struct {
	Message string `json:"message"`
}
