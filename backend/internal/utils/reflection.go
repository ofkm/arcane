package utils

import (
	"reflect"
	"strings"
)

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

// ExtractCategoryMetadata extracts category metadata from struct fields with catmeta tags
// Returns a map of category ID to category metadata in field order
func ExtractCategoryMetadata(model interface{}, categoryIDsInOrder []string) map[string]map[string]string {
	result := make(map[string]map[string]string)
	seenCategories := make(map[string]bool)

	rt := reflect.TypeOf(model)
	for i := 0; i < rt.NumField(); i++ {
		field := rt.Field(i)
		catmetaTag := field.Tag.Get("catmeta")
		if catmetaTag == "" {
			continue
		}

		meta := ParseMetaTag(catmetaTag)
		catID := meta["id"]
		if catID == "" || seenCategories[catID] {
			continue
		}

		seenCategories[catID] = true
		result[catID] = meta
	}

	return result
}

// Contains checks if a string slice contains an item
func Contains(slice []string, item string) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}
