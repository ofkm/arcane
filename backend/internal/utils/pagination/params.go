package pagination

import (
	"github.com/gin-gonic/gin"
	arcanehttp "github.com/ofkm/arcane-backend/internal/utils/http"
)

type QueryParams struct {
	SearchQuery
	SortParams
	PaginationParams
}

func ExtractListModifiersQueryParams(c *gin.Context) QueryParams {
	// search
	search, _ := arcanehttp.GetQueryParam(c, "search", true)
	// sorting
	sortField, _ := arcanehttp.GetQueryParam(c, "sort", true)
	sortOrder, _ := arcanehttp.GetQueryParam(c, "order", true)
	// pagination
	start, _ := arcanehttp.GetIntQueryParam(c, "start", true)
	limit, _ := arcanehttp.GetIntQueryParam(c, "limit", true)

	return QueryParams{
		SearchQuery{
			search: search,
		},
		SortParams{
			sort:  sortField,
			order: SortOrder(sortOrder),
		},
		PaginationParams{
			Start: start,
			Limit: limit,
		},
	}
}
