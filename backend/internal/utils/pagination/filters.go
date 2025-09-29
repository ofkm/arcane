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

type Config[T any] struct {
	SearchAccessors []SearchAccessor[T]
	SortBindings    []SortBinding[T]
}

func SearchOrderAndPaginate[T any](items []T, params QueryParams, searchConfig Config[T]) FilterResult[T] {
	totalAvailable := len(items)

	items = searchFn(items, params.SearchQuery, searchConfig.SearchAccessors)
	items = sortFunction(items, params.SortParams, searchConfig.SortBindings)

	totalCount := len(items)
	items = paginateItemsFunction(items, params.PaginationParams)

	return FilterResult[T]{
		Items:          items,
		TotalCount:     totalCount,
		TotalAvailable: totalAvailable,
	}
}

func ApplyFilterResultsHeaders[T any](w *gin.ResponseWriter, result FilterResult[T]) {
	(*w).Header().Set("X-Arcane-Total-Items", strconv.Itoa(result.TotalCount))
	(*w).Header().Set("X-Arcane-Total-Available", strconv.Itoa(result.TotalAvailable))
}
