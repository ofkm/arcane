package registry

import (
	"github.com/distribution/reference"
)

const (
	DefaultRegistryDomain = "docker.io"
	DefaultRegistryHost   = "index.docker.io"
)

func GetRegistryAddress(imageRef string) (string, error) {
	named, err := reference.ParseNormalizedNamed(imageRef)
	if err != nil {
		return "", err
	}
	addr := reference.Domain(named)
	if addr == DefaultRegistryDomain {
		return DefaultRegistryHost, nil
	}
	return addr, nil
}
