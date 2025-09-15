package registry

import (
	ref "github.com/distribution/reference"
)

type refNamed = ref.Named

func parseNormalizedNamed(s string) (ref.Named, error) {
	return ref.ParseNormalizedNamed(s)
}

func referencePath(n ref.Named) string {
	return ref.Path(n)
}

func tagNameOnly(n ref.Named) ref.Named {
	return ref.TagNameOnly(n)
}

func referenceDomain(n ref.Named) string {
	return ref.Domain(n)
}

func getTag(n ref.Named) (string, bool) {
	if nt, ok := n.(ref.NamedTagged); ok {
		return nt.Tag(), true
	}
	return "", false
}
