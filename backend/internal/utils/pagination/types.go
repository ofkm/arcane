package pagination

type Response struct {
	TotalPages      int64 `json:"totalPages"`
	TotalItems      int64 `json:"totalItems"`
	CurrentPage     int   `json:"currentPage"`
	ItemsPerPage    int   `json:"itemsPerPage"`
	GrandTotalItems int64 `json:"grandTotalItems,omitempty"`
}

type SortedPaginationRequest struct {
	Pagination struct {
		Page  int `form:"pagination[page]"`
		Limit int `form:"pagination[limit]"`
	} `form:"pagination"`
	Sort struct {
		Column    string `form:"sort[column]"`
		Direction string `form:"sort[direction]"`
	} `form:"sort"`
	Search  string                 `form:"search"`
	Filters map[string]interface{} `form:"filters"`
}
