package utils

import "strings"

// ParseMetaTag parses a struct tag meta value formatted as `k=v;other=val;...`
// Returns a map of key-value pairs extracted from the tag
func ParseMetaTag(tag string) map[string]string {
	res := map[string]string{}
	if tag == "" {
		return res
	}
	parts := strings.Split(tag, ";")
	for _, p := range parts {
		if p == "" {
			continue
		}
		if kv := strings.SplitN(p, "=", 2); len(kv) == 2 {
			res[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return res
}

// ParseKeywords parses a comma-separated keywords string into a slice
// Returns an empty slice if the input is empty or contains only whitespace
func ParseKeywords(keywordsStr string) []string {
	keywords := []string{}
	if k := strings.TrimSpace(keywordsStr); k != "" {
		for _, kk := range strings.Split(k, ",") {
			if t := strings.TrimSpace(kk); t != "" {
				keywords = append(keywords, t)
			}
		}
	}
	return keywords
}
