package cron

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var (
	// Cron field patterns
	cronFieldPattern = regexp.MustCompile(`^(\*|(\d+(-\d+)?)(,\d+(-\d+)?)*|\*/\d+)$`)
)

func ValidateCronExpression(expr string) (err error) {
	if expr == "" {
		return nil // Empty is valid (means immediate updates)
	}

	// Trim whitespace
	expr = strings.TrimSpace(expr)

	// Must have exactly 5 fields separated by spaces
	fields := strings.Fields(expr)
	if len(fields) != 5 {
		return fmt.Errorf("invalid cron expression: expected 5 fields (minute hour day month weekday), got %d", len(fields))
	}

	// Validate each field
	fieldNames := []string{"minute", "hour", "day", "month", "weekday"}
	fieldRanges := []struct{ min, max int }{
		{0, 59}, // minute
		{0, 23}, // hour
		{1, 31}, // day
		{1, 12}, // month
		{0, 6},  // weekday (0=Sunday)
	}

	for i, field := range fields {
		// Check basic pattern
		if !cronFieldPattern.MatchString(field) {
			return fmt.Errorf("invalid cron expression: %s field has invalid format", fieldNames[i])
		}

		// Validate numeric ranges
		if err := validateFieldRange(field, fieldRanges[i].min, fieldRanges[i].max, fieldNames[i]); err != nil {
			return err
		}
	}

	return nil
}

func validateFieldRange(field string, min, max int, fieldName string) error {
	// Skip wildcards but validate step values
	if field == "*" {
		return nil
	}
	// Validate step values like */6
	if strings.HasPrefix(field, "*/") {
		stepStr := strings.TrimPrefix(field, "*/")
		step, err := strconv.Atoi(stepStr)
		if err != nil {
			return fmt.Errorf("invalid cron expression: %s field has invalid step value", fieldName)
		}
		if step <= 0 || step > max {
			return fmt.Errorf("invalid cron expression: %s field step value %d out of range [1-%d]", fieldName, step, max)
		}
		return nil
	}

	// Handle ranges and lists
	parts := strings.Split(field, ",")
	for _, part := range parts {
		if strings.Contains(part, "-") {
			// Range like "1-5"
			rangeParts := strings.Split(part, "-")
			if len(rangeParts) != 2 {
				return fmt.Errorf("invalid cron expression: %s field has invalid range format", fieldName)
			}
			start, err1 := strconv.Atoi(rangeParts[0])
			end, err2 := strconv.Atoi(rangeParts[1])
			if err1 != nil || err2 != nil {
				return fmt.Errorf("invalid cron expression: %s field has non-numeric values", fieldName)
			}
			if start < min || start > max || end < min || end > max {
				return fmt.Errorf("invalid cron expression: %s field value out of range [%d-%d]", fieldName, min, max)
			}
			if start > end {
				return fmt.Errorf("invalid cron expression: %s field range start (%d) is greater than end (%d)", fieldName, start, end)
			}
		} else {
			// Single value
			val, err := strconv.Atoi(part)
			if err != nil {
				return fmt.Errorf("invalid cron expression: %s field has non-numeric value", fieldName)
			}
			if val < min || val > max {
				return fmt.Errorf("invalid cron expression: %s field value %d out of range [%d-%d]", fieldName, val, min, max)
			}
		}
	}

	return nil
}
