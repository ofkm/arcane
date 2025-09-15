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
	tag := "latest"
	if t, ok := getTag(named); ok {
		tag = t
	}

	return fmt.Sprintf("https://%s/v2/%s/manifests/%s", host, imgPath, tag), nil
}
