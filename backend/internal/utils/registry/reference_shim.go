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
