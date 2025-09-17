package utils

func Ptr[T any](v T) *T {
	return &v
}

func DerefString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
