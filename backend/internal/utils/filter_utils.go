package utils

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/docker/docker/api/types/filters"
)

// NormalizeQueryToFilters converts raw URL query into a flat filters map.
// Supports: filters[foo]=bar, filters.foo=bar, foo=bar.
func NormalizeQueryToFilters(q url.Values) map[string]interface{} {
	if q == nil {
		return nil
	}
	out := map[string]interface{}{}
	for k, vals := range q {
		// skip reserved
		if strings.HasPrefix(k, "pagination[") || strings.HasPrefix(k, "sort[") || k == "search" {
			continue
		}
		key := k
		if strings.HasPrefix(key, "filters[") && strings.HasSuffix(key, "]") {
			key = key[len("filters[") : len(key)-1]
		} else if strings.HasPrefix(key, "filters.") {
			key = key[len("filters."):]
		}
		if len(vals) == 1 {
			out[key] = vals[0]
		} else if len(vals) > 1 {
			out[key] = vals
		}
	}
	return out
}

// NormalizeFilterKeys flattens "filters[foo]" / "filters.foo" -> "foo".
func NormalizeFilterKeys(filtersMap map[string]interface{}) map[string]interface{} {
	if filtersMap == nil {
		return nil
	}
	out := make(map[string]interface{}, len(filtersMap))
	for k, v := range filtersMap {
		key := strings.TrimSpace(k)
		if strings.HasPrefix(key, "filters[") && strings.HasSuffix(key, "]") {
			key = key[len("filters[") : len(key)-1]
		} else if strings.HasPrefix(key, "filters.") {
			key = key[len("filters."):]
		}
		out[key] = v
	}
	return out
}

// ParseBoolAny interprets many input types as boolean: true/false, 1/0, "true"/"false", etc.
func ParseBoolAny(v interface{}) (bool, bool) {
	switch t := v.(type) {
	case bool:
		return t, true
	case string:
		s := strings.ToLower(strings.TrimSpace(t))
		if s == "true" || s == "1" {
			return true, true
		}
		if s == "false" || s == "0" {
			return false, true
		}
		if b, err := strconv.ParseBool(s); err == nil {
			return b, true
		}
	case []string:
		if len(t) > 0 {
			return ParseBoolAny(t[0])
		}
	case []interface{}:
		if len(t) > 0 {
			return ParseBoolAny(t[0])
		}
	default:
		s := fmt.Sprintf("%v", t)
		return ParseBoolAny(s)
	}
	return false, false
}

// BuildDockerFiltersFromMap builds Docker filters.Args from a flat filters map and a search string.
// Only allowedKeys are forwarded to the daemon. Search is mapped to name filter when provided.
func BuildDockerFiltersFromMap(filtersMap map[string]interface{}, search string, allowedKeys []string) filters.Args {
	f := filters.NewArgs()
	if strings.TrimSpace(search) != "" {
		f.Add("name", search)
	}
	allowed := map[string]bool{}
	for _, k := range allowedKeys {
		allowed[k] = true
	}
	for k, v := range filtersMap {
		if !allowed[k] {
			continue
		}
		switch t := v.(type) {
		case string:
			f.Add(k, t)
		case []string:
			for _, s := range t {
				f.Add(k, s)
			}
		case []interface{}:
			for _, it := range t {
				f.Add(k, fmt.Sprintf("%v", it))
			}
		default:
			f.Add(k, fmt.Sprintf("%v", t))
		}
	}
	return f
}

// PaginateSlice returns the page of items and a PaginationResponse.
func PaginateSlice[T any](items []T, page, limit int) ([]T, PaginationResponse) {
	if limit <= 0 {
		limit = len(items)
	}
	if page <= 0 {
		page = 1
	}
	totalItems := len(items)
	startIdx := (page - 1) * limit
	if startIdx > totalItems {
		startIdx = totalItems
	}
	endIdx := startIdx + limit
	if endIdx > totalItems {
		endIdx = totalItems
	}
	var pageItems []T
	if startIdx < endIdx {
		pageItems = items[startIdx:endIdx]
	} else {
		pageItems = []T{}
	}
	totalPages := (totalItems + limit - 1) / limit
	return pageItems, PaginationResponse{
		TotalPages:   int64(totalPages),
		TotalItems:   int64(totalItems),
		CurrentPage:  page,
		ItemsPerPage: limit,
	}
}
