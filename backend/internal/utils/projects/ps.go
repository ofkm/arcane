package projects

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	composetypes "github.com/compose-spec/compose-go/v2/types"
)

type PSInfo struct {
	Service     string
	Image       string
	Status      string
	ContainerID string
	Ports       []string
}

type ServiceStatus struct {
	Name        string
	Image       string
	Status      string
	ContainerID string
	Ports       []string
}

func ComposeServicesStatus(ctx context.Context, proj *composetypes.Project, composeFileFullPath, projectName string) ([]ServiceStatus, error) {
	if proj == nil {
		return nil, fmt.Errorf("compose project is nil")
	}

	services, byName := buildBaselineServices(proj)

	if out, err := RunComposeAction(ctx, composeFileFullPath, projectName, "ps"); err == nil {
		live := parseComposePS(out)
		if len(live) > 0 {
			mergeLiveStatuses(byName, live)
		}
	}

	return services, nil
}

func buildBaselineServices(proj *composetypes.Project) ([]ServiceStatus, map[string]*ServiceStatus) {
	services := make([]ServiceStatus, 0, len(proj.Services))
	byName := map[string]*ServiceStatus{}

	for _, svc := range proj.Services {
		item := ServiceStatus{
			Name:        svc.Name,
			Image:       svc.Image,
			Status:      "not created",
			ContainerID: "",
			Ports:       []string{},
		}
		for _, port := range svc.Ports {
			if port.Published != "" && port.Target != 0 {
				p := fmt.Sprintf("%s:%d", port.Published, port.Target)
				if port.Protocol != "" {
					p += "/" + port.Protocol
				}
				item.Ports = append(item.Ports, p)
			}
		}
		services = append(services, item)
		byName[svc.Name] = &services[len(services)-1]
	}
	return services, byName
}

func mergeLiveStatuses(byName map[string]*ServiceStatus, live []PSInfo) {
	for _, ls := range live {
		if dest, ok := byName[ls.Service]; ok {
			if strings.TrimSpace(ls.Status) != "" {
				dest.Status = ls.Status
			}
			if strings.TrimSpace(ls.ContainerID) != "" {
				dest.ContainerID = ls.ContainerID
			}
			if len(ls.Ports) > 0 {
				dest.Ports = ls.Ports
			}
			if strings.TrimSpace(ls.Image) != "" {
				dest.Image = ls.Image
			}
		}
	}
}

func ComposePS(ctx context.Context, dir, projectName string) ([]PSInfo, error) {
	composeFile, err := DetectComposeFile(dir)
	if err != nil {
		return nil, err
	}
	out, err := RunComposeAction(ctx, composeFile, projectName, "ps")
	if err != nil {
		return nil, err
	}
	return parseComposePS(out), nil
}

func parseComposePS(output string) []PSInfo {
	output = strings.TrimSpace(output)
	if output == "" {
		return nil
	}

	var services []PSInfo

	if strings.HasPrefix(output, "[") {
		var arr []map[string]any
		if err := json.Unmarshal([]byte(output), &arr); err == nil {
			for _, item := range arr {
				if svc, ok := parseComposeService(item); ok {
					services = append(services, svc)
				}
			}
			return services
		}
	}

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var item map[string]any
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			continue
		}
		if svc, ok := parseComposeService(item); ok {
			services = append(services, svc)
		}
	}

	return services
}

func parseComposeService(item map[string]any) (PSInfo, bool) {
	var svc PSInfo

	if v, ok := item["Service"].(string); ok && v != "" {
		svc.Service = v
	} else if v, ok := item["Name"].(string); ok && v != "" {
		svc.Service = v
	}

	if v, ok := item["Image"].(string); ok {
		svc.Image = v
	}
	if v, ok := item["State"].(string); ok {
		svc.Status = v
	} else if v, ok := item["Status"].(string); ok {
		svc.Status = v
	}
	if v, ok := item["ID"].(string); ok {
		svc.ContainerID = v
	} else if v, ok := item["ContainerID"].(string); ok {
		svc.ContainerID = v
	}

	svc.Ports = extractPortsFromItem(item)
	if pubs := extractPublishers(item); len(pubs) > 0 {
		svc.Ports = append(svc.Ports, pubs...)
	}

	if svc.Service == "" {
		return PSInfo{}, false
	}
	return svc, true
}

func extractPortsFromItem(item map[string]any) []string {
	var out []string
	if portsInterface, ok := item["Ports"]; ok {
		switch ports := portsInterface.(type) {
		case string:
			if ports != "" {
				out = append(out, ports)
			}
		case []any:
			for _, p := range ports {
				if ps, ok := p.(string); ok && ps != "" {
					out = append(out, ps)
				}
			}
		case []string:
			out = append(out, ports...)
		}
	}
	return out
}

func extractPublishers(item map[string]any) []string {
	var out []string
	if pubs, ok := item["Publishers"]; ok {
		if arr, ok := pubs.([]any); ok {
			return publishersFromArray(arr)
		}
	}
	return out
}

func publishersFromArray(arr []any) []string {
	var out []string
	for _, p := range arr {
		pm, ok := p.(map[string]any)
		if !ok {
			continue
		}
		if s := publisherToString(pm); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func publisherToString(pm map[string]any) string {
	if url, ok := pm["URL"].(string); ok && strings.TrimSpace(url) != "" {
		return url
	}

	published := anyToString(pm["PublishedPort"])
	target := anyToString(pm["TargetPort"])

	proto := ""
	if v, ok := pm["Protocol"].(string); ok && v != "" {
		proto = "/" + v
	}

	if published != "" && target != "" {
		return fmt.Sprintf("%s:%s%s", published, target, proto)
	}
	return ""
}

func anyToString(v any) string {
	switch t := v.(type) {
	case float64:
		return fmt.Sprintf("%.0f", t)
	case int:
		return fmt.Sprintf("%d", t)
	case int64:
		return fmt.Sprintf("%d", t)
	case string:
		return t
	default:
		return ""
	}
}
