package pagination

func ConvertQueryParamsToSortedRequest(q QueryParams) SortedPaginationRequest {
	limit := q.Limit
	if limit <= 0 {
		limit = 20
	}

	page := 1
	if limit > 0 {
		page = (q.Start / limit) + 1
	}

	var r SortedPaginationRequest
	r.Search = q.Search
	r.Sort.Column = q.sort

	// Convert SortOrder to string and default to asc when empty
	order := q.order
	if order == "" {
		order = SortAsc
	}
	r.Sort.Direction = string(order)

	r.Pagination.Page = page
	r.Pagination.Limit = limit

	return r
}
