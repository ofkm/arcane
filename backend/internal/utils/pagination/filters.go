package pagination

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

type FilterResult[T any] struct {
	Items          []T
	TotalCount     int
	TotalAvailable int
}

type FilterAccessor[T any] struct {
	Key string
	Fn  func(item T, filterValue string) bool
}

type Config[T any] struct {
	SearchAccessors []SearchAccessor[T]
	SortBindings    []SortBinding[T]
	FilterAccessors []FilterAccessor[T]
}

func SearchOrderAndPaginate[T any](items []T, params QueryParams, searchConfig Config[T]) FilterResult[T] {
	totalAvailable := len(items)

	items = searchFn(items, params.SearchQuery, searchConfig.SearchAccessors)
	items = filterFn(items, params.Filters, searchConfig.FilterAccessors)
	items = sortFunction(items, params.SortParams, searchConfig.SortBindings)

	totalCount := len(items)
	items = paginateItemsFunction(items, params.PaginationParams)

	return FilterResult[T]{
		Items:          items,
		TotalCount:     totalCount,
		TotalAvailable: totalAvailable,
	}
}

func filterFn[T any](items []T, filters map[string]string, accessors []FilterAccessor[T]) []T {
	if len(filters) == 0 {
		return items
	}

	results := []T{}
	for _, item := range items {
		matches := true
		for key, value := range filters {
			found := false
			for _, accessor := range accessors {
				if accessor.Key == key {
					if !accessor.Fn(item, value) {
						matches = false
					}
					found = true
					break
				}
			}
			if !found {
				matches = false
			}
			if !matches {
				break
			}
		}
		if matches {
			results = append(results, item)
		}
	}
	return results
}

func ApplyFilterResultsHeaders[T any](w *gin.ResponseWriter, result FilterResult[T]) {
	(*w).Header().Set("X-Arcane-Total-Items", strconv.Itoa(result.TotalCount))
	(*w).Header().Set("X-Arcane-Total-Available", strconv.Itoa(result.TotalAvailable))
}
