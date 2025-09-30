package pagination

import (
	"reflect"
	"strconv"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func PaginateAndSortDB(params QueryParams, query *gorm.DB, result interface{}) (Response, error) {
	sortColumn := params.sort
	sortDirection := string(params.order)

	if sortDirection == "" {
		sortDirection = "asc"
	}

	capitalizedSortColumn := capitalizeFirstLetter(sortColumn)
	sortField, sortFieldFound := reflect.TypeOf(result).Elem().Elem().FieldByName(capitalizedSortColumn)
	isSortable, _ := strconv.ParseBool(sortField.Tag.Get("sortable"))

	sortDirection = normalizeSortDirection(sortDirection)

	if sortFieldFound && isSortable {
		columnName := camelCaseToSnakeCase(sortColumn)
		query = query.Clauses(clause.OrderBy{
			Columns: []clause.OrderByColumn{
				{Column: clause.Column{Name: columnName}, Desc: sortDirection == "desc"},
			},
		})
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}

	page := 1
	if limit > 0 {
		page = (params.Start / limit) + 1
	}

	return paginateDB(page, limit, query, result)
}

func paginateDB(page int, pageSize int, query *gorm.DB, result interface{}) (Response, error) {
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * pageSize

	var totalItems int64
	if err := query.Count(&totalItems).Error; err != nil {
		return Response{}, err
	}

	if err := query.Offset(offset).Limit(pageSize).Find(result).Error; err != nil {
		return Response{}, err
	}

	totalPages := (totalItems + int64(pageSize) - 1) / int64(pageSize)
	if totalItems == 0 {
		totalPages = 1
	}

	return Response{
		TotalPages:   totalPages,
		TotalItems:   totalItems,
		CurrentPage:  page,
		ItemsPerPage: pageSize,
	}, nil
}

func normalizeSortDirection(direction string) string {
	if direction != "asc" && direction != "desc" {
		return "asc"
	}
	return direction
}

func capitalizeFirstLetter(str string) string {
	if len(str) == 0 {
		return str
	}
	return string(str[0]-32) + str[1:]
}

func camelCaseToSnakeCase(str string) string {
	var result []rune
	for i, r := range str {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result = append(result, '_')
		}
		if r >= 'A' && r <= 'Z' {
			result = append(result, r+32)
		} else {
			result = append(result, r)
		}
	}
	return string(result)
}
