package http

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetQueryParam reads a string query parameter from the Gin context.
// If `required` is true and the parameter is missing or empty, an error is returned.
func GetQueryParam(c *gin.Context, name string, required bool) (string, error) {
	v, ok := c.GetQuery(name)
	if !ok || v == "" {
		if required {
			return "", fmt.Errorf("missing query parameter %s", name)
		}
		return "", nil
	}
	return v, nil
}

// GetIntQueryParam reads and parses an integer query parameter from the Gin context.
// If `required` is true and the parameter is missing, or if parsing fails, an error is returned.
func GetIntQueryParam(c *gin.Context, name string, required bool) (int, error) {
	v, ok := c.GetQuery(name)
	if !ok || v == "" {
		if required {
			return 0, fmt.Errorf("missing numeric query parameter %s", name)
		}
		return 0, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("invalid numeric query parameter %s: %w", name, err)
	}
	return n, nil
}
