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

	capitalizedSortColumn := CapitalizeFirstLetter(sort.Column)

	sortField, sortFieldFound := reflect.TypeOf(result).Elem().Elem().FieldByName(capitalizedSortColumn)
	isSortable, _ := strconv.ParseBool(sortField.Tag.Get("sortable"))

	sort.Direction = NormalizeSortDirection(sort.Direction)

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

func NormalizeSortDirection(direction string) string {
	d := strings.ToLower(strings.TrimSpace(direction))
	if d != "asc" && d != "desc" {
		return "asc"
	}
	return d
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

//nolint:gocognit
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
