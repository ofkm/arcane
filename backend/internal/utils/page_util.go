package utils

import (
	"reflect"
	"sort"
	"strconv"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PaginationResponse struct {
	TotalPages   int64 `json:"totalPages"`
	TotalItems   int64 `json:"totalItems"`
	CurrentPage  int   `json:"currentPage"`
	ItemsPerPage int   `json:"itemsPerPage"`
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

type SimplePaginationRequest struct {
	Page  int `form:"page" json:"page"`
	Limit int `form:"limit" json:"limit"`
}

type SimpleSortRequest struct {
	Column    string `form:"column" json:"column"`
	Direction string `form:"direction" json:"direction"`
}

type PaginationOptions struct {
	DefaultPageSize int
	MaxPageSize     int
	AllowedSorts    []string
}

func PaginateAndSort(sortedPaginationRequest SortedPaginationRequest, query *gorm.DB, result interface{}) (PaginationResponse, error) {
	pagination := sortedPaginationRequest.Pagination
	sort := sortedPaginationRequest.Sort

	if sort.Column == "" {
		return Paginate(pagination.Page, pagination.Limit, query, result)
	}

	capitalizedSortColumn := CapitalizeFirstLetter(sort.Column)

	// Get the element type correctly
	resultType := reflect.TypeOf(result)
	if resultType.Kind() == reflect.Ptr {
		resultType = resultType.Elem()
	}
	if resultType.Kind() == reflect.Slice {
		resultType = resultType.Elem()
	}
	if resultType.Kind() == reflect.Ptr {
		resultType = resultType.Elem()
	}

	sortField, sortFieldFound := resultType.FieldByName(capitalizedSortColumn)
	isSortable := false
	if sortFieldFound {
		if sortableTag := sortField.Tag.Get("sortable"); sortableTag != "" {
			isSortable, _ = strconv.ParseBool(sortableTag)
		}
	}

	if sort.Direction == "" || (sort.Direction != "asc" && sort.Direction != "desc") {
		sort.Direction = "asc"
	}

	if sortFieldFound && isSortable {
		columnName := CamelCaseToSnakeCase(sort.Column)
		query = query.Clauses(clause.OrderBy{
			Columns: []clause.OrderByColumn{
				{Column: clause.Column{Name: columnName}, Desc: sort.Direction == "desc"},
			},
		})
	}

	return Paginate(pagination.Page, pagination.Limit, query, result)
}

func PaginateWithSort(page, pageSize int, sortColumn, sortDirection string, query *gorm.DB, result interface{}, options *PaginationOptions) (PaginationResponse, error) {
	if options == nil {
		options = &PaginationOptions{
			DefaultPageSize: 20,
			MaxPageSize:     100,
		}
	}

	if sortColumn != "" && sortDirection != "" {
		if len(options.AllowedSorts) == 0 || contains(options.AllowedSorts, sortColumn) {
			if sortDirection != "asc" && sortDirection != "desc" {
				sortDirection = "asc"
			}

			columnName := CamelCaseToSnakeCase(sortColumn)
			query = query.Clauses(clause.OrderBy{
				Columns: []clause.OrderByColumn{
					{Column: clause.Column{Name: columnName}, Desc: sortDirection == "desc"},
				},
			})
		}
	}

	return Paginate(page, pageSize, query, result)
}

func Paginate(page int, pageSize int, query *gorm.DB, result interface{}) (PaginationResponse, error) {
	if page < 1 {
		page = 1
	}

	if pageSize < 1 {
		pageSize = 20
	} else if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	var totalItems int64
	if err := query.Count(&totalItems).Error; err != nil {
		return PaginationResponse{}, err
	}

	if err := query.Offset(offset).Limit(pageSize).Find(result).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := (totalItems + int64(pageSize) - 1) / int64(pageSize)
	if totalItems == 0 {
		totalPages = 1
	}

	return PaginationResponse{
		TotalPages:   totalPages,
		TotalItems:   totalItems,
		CurrentPage:  page,
		ItemsPerPage: pageSize,
	}, nil
}

func PaginateSimple(req SimplePaginationRequest, query *gorm.DB, result interface{}) (PaginationResponse, error) {
	return Paginate(req.Page, req.Limit, query, result)
}

func ApplySort(sort SimpleSortRequest, query *gorm.DB, allowedColumns []string) *gorm.DB {
	if sort.Column == "" {
		return query
	}

	if len(allowedColumns) > 0 && !contains(allowedColumns, sort.Column) {
		return query
	}

	if sort.Direction != "asc" && sort.Direction != "desc" {
		sort.Direction = "asc"
	}

	columnName := CamelCaseToSnakeCase(sort.Column)
	return query.Order(columnName + " " + sort.Direction)
}

func CamelCaseToSnakeCase(str string) string {
	var result strings.Builder
	for i, r := range str {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

func CapitalizeFirstLetter(str string) string {
	if len(str) == 0 {
		return str
	}
	return strings.ToUpper(str[:1]) + str[1:]
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func ValidatePaginationParams(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}
	return page, limit
}

func GetOffsetFromPage(page, pageSize int) int {
	if page < 1 {
		page = 1
	}
	return (page - 1) * pageSize
}

func CalculateTotalPages(totalItems int64, pageSize int) int64 {
	if totalItems == 0 {
		return 1
	}
	return (totalItems + int64(pageSize) - 1) / int64(pageSize)
}

func SortSliceByField(data []map[string]interface{}, field, direction string) {
	if field == "" {
		return
	}

	sort.Slice(data, func(i, j int) bool {
		val1, exists1 := data[i][field]
		val2, exists2 := data[j][field]

		if !exists1 && !exists2 {
			return false
		}
		if !exists1 {
			return direction == "desc"
		}
		if !exists2 {
			return direction == "asc"
		}

		switch v1 := val1.(type) {
		case string:
			v2, ok := val2.(string)
			if !ok {
				return false
			}
			if direction == "desc" {
				return v1 > v2
			}
			return v1 < v2
		case int:
			v2, ok := val2.(int)
			if !ok {
				return false
			}
			if direction == "desc" {
				return v1 > v2
			}
			return v1 < v2
		case int64:
			v2, ok := val2.(int64)
			if !ok {
				return false
			}
			if direction == "desc" {
				return v1 > v2
			}
			return v1 < v2
		case float64:
			v2, ok := val2.(float64)
			if !ok {
				return false
			}
			if direction == "desc" {
				return v1 > v2
			}
			return v1 < v2
		default:
			return false
		}
	})
}
