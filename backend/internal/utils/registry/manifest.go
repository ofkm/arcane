package registry

import "fmt"

func BuildManifestURLFromRef(imageRef string) (string, error) {
	named, err := parseNormalizedNamed(imageRef)
	if err != nil {
		return "", err
	}
	named = tagNameOnly(named)

	host, err := GetRegistryAddress(named.String())
	if err != nil {
		return "", err
	}

	imgPath := referencePath(named)

	identifier := "latest"
	if dgst, ok := getDigest(named); ok {
		identifier = dgst
	} else if t, ok := getTag(named); ok {
		identifier = t
	}

	return fmt.Sprintf("https://%s/v2/%s/manifests/%s", host, imgPath, identifier), nil
}
