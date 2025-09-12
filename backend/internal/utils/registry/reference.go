package registry

import (
	"fmt"
	"strings"
)

func (c *Client) SplitImageReference(reference string) (string, string, string, error) {
	if reference == "" {
		return "", "", "", fmt.Errorf("empty reference provided")
	}

	splits := strings.Split(reference, "/")
	var registry, repositoryAndTag string

	switch len(splits) {
	case 1:
		registry = DefaultRegistry
		repositoryAndTag = reference
	default:
		switch {
		case splits[0] == "docker.io":
			registry = DefaultRegistry
			repositoryAndTag = strings.Join(splits[1:], "/")
		case splits[0] == "localhost" || strings.Contains(splits[0], ".") || strings.Contains(splits[0], ":"):
			registry = splits[0]
			repositoryAndTag = strings.Join(splits[1:], "/")
		default:
			registry = DefaultRegistry
			repositoryAndTag = reference
		}
	}

	repositoryAndTag = strings.Split(repositoryAndTag, "@")[0]
	tagSplits := strings.Split(repositoryAndTag, ":")
	var repository, tag string
	switch len(tagSplits) {
	case 1:
		repository = tagSplits[0]
		tag = "latest"
	case 2:
		repository = tagSplits[0]
		tag = tagSplits[1]
	default:
		return "", "", "", fmt.Errorf("invalid reference format: %s", repositoryAndTag)
	}

	if !strings.Contains(repository, "/") && registry == DefaultRegistry {
		repository = "library/" + repository
	}
	return registry, repository, tag, nil
}

// ExtractRegistryDomain normalizes docker hub to docker.io
func ExtractRegistryDomain(imageRef string) (string, error) {
	c := NewClient()
	reg, _, _, err := c.SplitImageReference(imageRef)
	if err != nil {
		return "", err
	}
	if reg == DefaultRegistry {
		return "docker.io", nil
	}
	return reg, nil
}
