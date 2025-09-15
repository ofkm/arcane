package registry

import (
	"fmt"

	ref "github.com/distribution/reference"
)

func BuildManifestURLFromRef(imageRef string) (string, error) {
	named, err := ref.ParseNormalizedNamed(imageRef)
	if err != nil {
		return "", err
	}
	// Ensure a tag (default latest if none)
	named = ref.TagNameOnly(named)

	host, err := GetRegistryAddress(named.String())
	if err != nil {
		return "", err
	}

	imgPath := ref.Path(named)
	tag := "latest"
	if nt, ok := named.(ref.NamedTagged); ok {
		tag = nt.Tag()
	}

	return fmt.Sprintf("https://%s/v2/%s/manifests/%s", host, imgPath, tag), nil
}
