package projects

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

func UpdateServiceLabels(composeFilePath string, labelsToAdd map[string]string) error {
	content, err := os.ReadFile(composeFilePath)
	if err != nil {
		return fmt.Errorf("read compose file: %w", err)
	}

	var root yaml.Node
	if err := yaml.Unmarshal(content, &root); err != nil {
		return fmt.Errorf("parse yaml: %w", err)
	}

	// Navigate to the document content
	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return fmt.Errorf("invalid yaml document structure")
	}

	docNode := root.Content[0]
	if docNode.Kind != yaml.MappingNode {
		return fmt.Errorf("expected mapping node at document root")
	}

	// Find the services node
	servicesNode, err := findMappingKey(docNode, "services")
	if err != nil {
		return fmt.Errorf("find services: %w", err)
	}

	if servicesNode.Kind != yaml.MappingNode {
		return fmt.Errorf("services must be a mapping")
	}

	// Iterate through each service and update labels
	for i := 0; i < len(servicesNode.Content); i += 2 {
		serviceNode := servicesNode.Content[i+1]

		if serviceNode.Kind != yaml.MappingNode {
			continue
		}

		// Find or create labels node for this service
		labelsNode, err := findMappingKey(serviceNode, "labels")
		if err != nil {
			// Labels key doesn't exist, create it as a mapping
			labelsNode = &yaml.Node{
				Kind: yaml.MappingNode,
			}
			// Add labels key and value to service
			serviceNode.Content = append(serviceNode.Content,
				&yaml.Node{Kind: yaml.ScalarNode, Value: "labels"},
				labelsNode,
			)
		}

		// Convert array-style labels to mapping if needed
		if labelsNode.Kind == yaml.SequenceNode {
			labelsNode = convertArrayLabelsToMapping(labelsNode)
			// Update the serviceNode to use the new mapping
			for j := 0; j < len(serviceNode.Content); j += 2 {
				if serviceNode.Content[j].Value == "labels" {
					serviceNode.Content[j+1] = labelsNode
					break
				}
			}
		}

		// Update Arcane labels
		for labelKey, labelValue := range labelsToAdd {
			if !strings.HasPrefix(labelKey, "com.ofkm.arcane.") {
				continue // Only update Arcane labels
			}
			setMappingValue(labelsNode, labelKey, labelValue)
		}
	}

	// Marshal back to YAML
	output, err := yaml.Marshal(&root)
	if err != nil {
		return fmt.Errorf("marshal yaml: %w", err)
	}

	// Write back to file
	if err := os.WriteFile(composeFilePath, output, 0644); err != nil {
		return fmt.Errorf("write compose file: %w", err)
	}

	return nil
}

func UpdateServiceLabelsPerService(composeFilePath string, serviceLabels map[string]map[string]string) error {
	content, err := os.ReadFile(composeFilePath)
	if err != nil {
		return fmt.Errorf("read compose file: %w", err)
	}

	var root yaml.Node
	if err := yaml.Unmarshal(content, &root); err != nil {
		return fmt.Errorf("parse yaml: %w", err)
	}

	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return fmt.Errorf("invalid yaml document structure")
	}

	docNode := root.Content[0]
	if docNode.Kind != yaml.MappingNode {
		return fmt.Errorf("expected mapping node at document root")
	}

	servicesNode, err := findMappingKey(docNode, "services")
	if err != nil {
		return fmt.Errorf("find services: %w", err)
	}

	if servicesNode.Kind != yaml.MappingNode {
		return fmt.Errorf("services must be a mapping")
	}

	// Iterate through each service
	for i := 0; i < len(servicesNode.Content); i += 2 {
		serviceName := servicesNode.Content[i].Value
		serviceNode := servicesNode.Content[i+1]

		if serviceNode.Kind != yaml.MappingNode {
			continue
		}

		// Check if we have labels to update for this service
		labelsToAdd, ok := serviceLabels[serviceName]
		if !ok {
			continue
		}

		// Find or create labels node
		labelsNode, err := findMappingKey(serviceNode, "labels")
		if err != nil {
			labelsNode = &yaml.Node{Kind: yaml.MappingNode}
			serviceNode.Content = append(serviceNode.Content,
				&yaml.Node{Kind: yaml.ScalarNode, Value: "labels"},
				labelsNode,
			)
		}

		// Convert array-style to mapping if needed
		if labelsNode.Kind == yaml.SequenceNode {
			labelsNode = convertArrayLabelsToMapping(labelsNode)
			for j := 0; j < len(serviceNode.Content); j += 2 {
				if serviceNode.Content[j].Value == "labels" {
					serviceNode.Content[j+1] = labelsNode
					break
				}
			}
		}

		// Update Arcane labels for this service
		for labelKey, labelValue := range labelsToAdd {
			if !strings.HasPrefix(labelKey, "com.ofkm.arcane.") {
				continue
			}
			setMappingValue(labelsNode, labelKey, labelValue)
		}
	}

	output, err := yaml.Marshal(&root)
	if err != nil {
		return fmt.Errorf("marshal yaml: %w", err)
	}

	if err := os.WriteFile(composeFilePath, output, 0644); err != nil {
		return fmt.Errorf("write compose file: %w", err)
	}

	return nil
}

func GetServiceLabels(composeFilePath string) (map[string]string, error) {
	content, err := os.ReadFile(composeFilePath)
	if err != nil {
		return nil, fmt.Errorf("read compose file: %w", err)
	}

	var root yaml.Node
	if err := yaml.Unmarshal(content, &root); err != nil {
		return nil, fmt.Errorf("parse yaml: %w", err)
	}

	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return nil, fmt.Errorf("invalid yaml document structure")
	}

	docNode := root.Content[0]
	if docNode.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("expected mapping node at document root")
	}

	// Find the services node
	servicesNode, err := findMappingKey(docNode, "services")
	if err != nil {
		return nil, fmt.Errorf("find services: %w", err)
	}

	if servicesNode.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("services must be a mapping")
	}

	// Get the first service
	if len(servicesNode.Content) < 2 {
		return map[string]string{}, nil // No services
	}

	firstServiceNode := servicesNode.Content[1]
	if firstServiceNode.Kind != yaml.MappingNode {
		return map[string]string{}, nil
	}

	// Find labels in the first service
	labelsNode, err := findMappingKey(firstServiceNode, "labels")
	if err != nil {
		return map[string]string{}, nil // No labels
	}

	if labelsNode.Kind != yaml.MappingNode && labelsNode.Kind != yaml.SequenceNode {
		return map[string]string{}, nil
	}

	// Extract Arcane labels
	result := make(map[string]string)

	if labelsNode.Kind == yaml.MappingNode {
		// Labels as key-value mapping
		for i := 0; i < len(labelsNode.Content); i += 2 {
			key := labelsNode.Content[i].Value
			value := labelsNode.Content[i+1].Value

			if strings.HasPrefix(key, "com.ofkm.arcane.") {
				result[key] = value
			}
		}
	} else if labelsNode.Kind == yaml.SequenceNode {
		// Labels as array of strings
		for _, item := range labelsNode.Content {
			if item.Value == "" {
				continue
			}
			parts := strings.SplitN(item.Value, "=", 2)
			if len(parts) == 2 && strings.HasPrefix(parts[0], "com.ofkm.arcane.") {
				result[parts[0]] = parts[1]
			}
		}
	}

	return result, nil
}

//nolint:gocognit
func GetAllServiceLabels(composeFilePath string) (map[string]map[string]string, error) {
	content, err := os.ReadFile(composeFilePath)
	if err != nil {
		return nil, fmt.Errorf("read compose file: %w", err)
	}

	var root yaml.Node
	if err := yaml.Unmarshal(content, &root); err != nil {
		return nil, fmt.Errorf("parse yaml: %w", err)
	}

	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return nil, fmt.Errorf("invalid yaml document structure")
	}

	docNode := root.Content[0]
	if docNode.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("expected mapping node at document root")
	}

	servicesNode, err := findMappingKey(docNode, "services")
	if err != nil {
		return nil, fmt.Errorf("find services: %w", err)
	}

	if servicesNode.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("services must be a mapping")
	}

	result := make(map[string]map[string]string)

	// Iterate through each service
	for i := 0; i < len(servicesNode.Content); i += 2 {
		serviceName := servicesNode.Content[i].Value
		serviceNode := servicesNode.Content[i+1]

		if serviceNode.Kind != yaml.MappingNode {
			continue
		}

		serviceLabels := make(map[string]string)

		// Find labels in this service
		labelsNode, err := findMappingKey(serviceNode, "labels")
		if err != nil {
			result[serviceName] = serviceLabels
			continue
		}

		if labelsNode.Kind == yaml.MappingNode {
			for j := 0; j < len(labelsNode.Content); j += 2 {
				key := labelsNode.Content[j].Value
				value := labelsNode.Content[j+1].Value
				if strings.HasPrefix(key, "com.ofkm.arcane.") {
					serviceLabels[key] = value
				}
			}
		} else if labelsNode.Kind == yaml.SequenceNode {
			for _, item := range labelsNode.Content {
				if item.Value == "" {
					continue
				}
				parts := strings.SplitN(item.Value, "=", 2)
				if len(parts) == 2 && strings.HasPrefix(parts[0], "com.ofkm.arcane.") {
					serviceLabels[parts[0]] = parts[1]
				}
			}
		}

		result[serviceName] = serviceLabels
	}

	return result, nil
}

// findMappingKey finds a key in a mapping node and returns its value node
func findMappingKey(node *yaml.Node, key string) (*yaml.Node, error) {
	if node.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("not a mapping node")
	}

	for i := 0; i < len(node.Content); i += 2 {
		if node.Content[i].Value == key {
			return node.Content[i+1], nil
		}
	}

	return nil, fmt.Errorf("key %q not found", key)
}

// setMappingValue sets or updates a key-value pair in a mapping node
func setMappingValue(node *yaml.Node, key, value string) {
	if node.Kind != yaml.MappingNode {
		return
	}

	// Check if key exists and update it
	for i := 0; i < len(node.Content); i += 2 {
		if node.Content[i].Value == key {
			node.Content[i+1].Value = value
			return
		}
	}

	// Key doesn't exist, add it
	node.Content = append(node.Content,
		&yaml.Node{Kind: yaml.ScalarNode, Value: key},
		&yaml.Node{Kind: yaml.ScalarNode, Value: value},
	)
}

// convertArrayLabelsToMapping converts array-style labels to mapping-style
func convertArrayLabelsToMapping(arrayNode *yaml.Node) *yaml.Node {
	mappingNode := &yaml.Node{
		Kind: yaml.MappingNode,
	}

	if arrayNode.Kind != yaml.SequenceNode {
		return mappingNode
	}

	// Parse array items like "key=value"
	for _, item := range arrayNode.Content {
		if item.Value == "" {
			continue
		}
		parts := strings.SplitN(item.Value, "=", 2)
		if len(parts) == 2 {
			mappingNode.Content = append(mappingNode.Content,
				&yaml.Node{Kind: yaml.ScalarNode, Value: parts[0]},
				&yaml.Node{Kind: yaml.ScalarNode, Value: parts[1]},
			)
		}
	}

	return mappingNode
}
