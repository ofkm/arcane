package registry

import ref "github.com/distribution/reference"

func GetRegistryAddress(imageRef string) (string, error) {
	named, err := ref.ParseNormalizedNamed(imageRef)
	if err != nil {
		return "", err
	}
	addr := ref.Domain(named)
	if addr == DefaultRegistryDomain {
		return DefaultRegistryHost, nil
	}
	return addr, nil
}
