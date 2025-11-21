package common

import "fmt"

type InvalidRequestFormatError struct {
	Err error
}

func (e *InvalidRequestFormatError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("Invalid request format: %v", e.Err)
	}
	return "Invalid request format"
}
