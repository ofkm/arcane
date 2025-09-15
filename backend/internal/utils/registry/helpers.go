package registry

const (
	DefaultRegistryDomain = "docker.io"
	DefaultRegistryHost   = "index.docker.io"
)

func GetRegistryAddress(imageRef string) (string, error) {
	named, err := parseNormalizedNamed(imageRef)
	if err != nil {
		return "", err
	}
	addr := referenceDomain(named)
	if addr == DefaultRegistryDomain {
		return DefaultRegistryHost, nil
	}
	return addr, nil
}
