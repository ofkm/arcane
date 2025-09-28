package utils

import (
	"fmt"
	"net/url"
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

// PaginateAndSort applies sorting, optional filtering and pagination to the provided GORM query.
// filtersOpt is an optional override for filters: map[string][]string. If omitted, filters are taken from the request.
func PaginateAndSort(sortedPaginationRequest SortedPaginationRequest, query *gorm.DB, result interface{}, filtersOpt ...map[string][]string) (PaginationResponse, error) {
	var filters map[string][]string
	if len(filtersOpt) > 0 && filtersOpt[0] != nil {
		filters = filtersOpt[0]
	} else {
		// convert request Filters (map[string]interface{}) -> map[string][]string
		filters = make(map[string][]string)
		for k, v := range sortedPaginationRequest.Filters {
			switch tv := v.(type) {
			case []string:
				filters[k] = tv
			case string:
				// allow comma separated or single string
				parts := strings.Split(tv, ",")
				for i := range parts {
					parts[i] = strings.TrimSpace(parts[i])
				}
				filters[k] = parts
			case []interface{}:
				var out []string
				for _, it := range tv {
					out = append(out, fmt.Sprintf("%v", it))
				}
				filters[k] = out
			default:
				// fallback single value
				filters[k] = []string{fmt.Sprintf("%v", tv)}
			}
		}
	}

	pagination := sortedPaginationRequest.Pagination
	sortReq := sortedPaginationRequest.Sort

	capitalizedSortColumn := CapitalizeFirstLetter(sortReq.Column)

	// Find struct field on result to check sortable tag
	sortFieldFound := false
	isSortable := false
	if result != nil {
		if t := reflect.TypeOf(result); t != nil {
			// derive model field type safely
			if t.Kind() == reflect.Ptr {
				t = t.Elem()
			}
			if t.Kind() == reflect.Slice {
				t = t.Elem()
			}
			if t.Kind() == reflect.Ptr {
				t = t.Elem()
			}
			if t.Kind() == reflect.Struct {
				if f, ok := t.FieldByName(capitalizedSortColumn); ok {
					sortFieldFound = true
					isSortable, _ = strconv.ParseBool(f.Tag.Get("sortable"))
				}
			}
		}
	}

	sortReq.Direction = NormalizeSortDirection(sortReq.Direction)
	if sortFieldFound && isSortable {
		columnName := CamelCaseToSnakeCase(sortReq.Column)
		query = query.Clauses(clause.OrderBy{
			Columns: []clause.OrderByColumn{
				{Column: clause.Column{Name: columnName}, Desc: sortReq.Direction == "desc"},
			},
		})
	}

	if len(filters) > 0 && result != nil {
		query = applyFilters(filters, query, result)
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
		TotalPages:      totalPages,
		TotalItems:      totalItems,
		CurrentPage:     page,
		ItemsPerPage:    pageSize,
		GrandTotalItems: totalItems,
	}, nil
}

// applyFilters applies the provided filter map to the GORM query.
// It mirrors the sortable allowlist logic using the model's `filterable:"true"` tag.
//
//nolint:gocognit
func applyFilters(filters map[string][]string, query *gorm.DB, result interface{}) *gorm.DB {
	if len(filters) == 0 || result == nil {
		return query
	}

	// Derive model type from *[]T or *[]*T
	t := reflect.TypeOf(result)
	if t == nil {
		return query
	}
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}
	if t.Kind() == reflect.Slice {
		t = t.Elem()
	}
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}
	if t.Kind() != reflect.Struct {
		return query
	}
	modelType := t

	for col, vals := range filters {
		// Special-case: support filtering on image update flag stored in image_updates table
		// Accept keys: "hasUpdate", "updates", "updateInfo.hasUpdate" when model is Image.
		if modelType.Name() == "Image" {
			lc := strings.ToLower(col)
			if lc == "hasupdate" || lc == "updates" || lc == "updateinfo.hasupdate" {
				var arr []bool
				for _, s := range vals {
					if b, err := strconv.ParseBool(strings.ToLower(strings.TrimSpace(s))); err == nil {
						arr = append(arr, b)
					}
				}
				if len(arr) > 0 {
					query = query.Where("EXISTS (SELECT 1 FROM image_updates WHERE image_updates.id = images.id AND image_updates.has_update IN ?)", arr)
				}
				continue
			}
		}

		field, ok := modelType.FieldByName(CapitalizeFirstLetter(col))
		if !ok {
			continue
		}
		isFilterable, _ := strconv.ParseBool(field.Tag.Get("filterable"))
		if !isFilterable {
			continue
		}
		columnName := CamelCaseToSnakeCase(col)

		// Unwrap pointer fields
		ft := field.Type
		if ft.Kind() == reflect.Ptr {
			ft = ft.Elem()
		}
		kind := ft.Kind()

		// Bool handling
		if kind == reflect.Bool {
			var arr []bool
			for _, s := range vals {
				if b, err := strconv.ParseBool(strings.ToLower(strings.TrimSpace(s))); err == nil {
					arr = append(arr, b)
				}
			}
			if len(arr) > 0 {
				query = query.Where(columnName+" IN ?", arr)
			}
			continue
		}

		// Signed integers
		if isSignedIntKind(kind) {
			var arr []int64
			for _, s := range vals {
				if n, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil {
					arr = append(arr, n)
				}
			}
			if len(arr) > 0 {
				query = query.Where(columnName+" IN ?", arr)
			}
			continue
		}

		// Unsigned integers
		if isUnsignedIntKind(kind) {
			var arr []uint64
			for _, s := range vals {
				if n, err := strconv.ParseUint(strings.TrimSpace(s), 10, 64); err == nil {
					arr = append(arr, n)
				}
			}
			if len(arr) > 0 {
				query = query.Where(columnName+" IN ?", arr)
			}
			continue
		}

		// Fallback: treat as string values
		var arr []string
		for _, s := range vals {
			if v := strings.TrimSpace(s); v != "" {
				arr = append(arr, v)
			}
		}
		if len(arr) > 0 {
			valsIface := make([]interface{}, len(arr))
			for i, v := range arr {
				valsIface[i] = v
			}
			query = query.Where(clause.IN{Column: clause.Column{Name: columnName}, Values: valsIface})
		}
	}

	return query
}

func isSignedIntKind(k reflect.Kind) bool {
	return k == reflect.Int || k == reflect.Int8 || k == reflect.Int16 || k == reflect.Int32 || k == reflect.Int64
}

func isUnsignedIntKind(k reflect.Kind) bool {
	return k == reflect.Uint || k == reflect.Uint8 || k == reflect.Uint16 || k == reflect.Uint32 || k == reflect.Uint64 || k == reflect.Uintptr
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

func ParseFiltersFromQuery(raw url.Values) map[string][]string {
	out := make(map[string][]string)
	if raw == nil {
		return out
	}
	for k, vals := range raw {
		if !strings.HasPrefix(k, "filters[") {
			continue
		}
		rest := k[len("filters["):]
		i := strings.IndexByte(rest, ']')
		if i <= 0 {
			continue
		}
		name := rest[:i]
		if name == "" || len(vals) == 0 {
			continue
		}
		out[name] = append(out[name], vals...)
	}
	return out
}
