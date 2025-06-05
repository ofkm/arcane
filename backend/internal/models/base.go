package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Base model with common fields
type BaseModel struct {
	CreatedAt time.Time  `json:"createdAt" gorm:"not null"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
}

// JSON type for handling JSON columns
type JSON map[string]interface{}

func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into JSON", value)
	}

	return json.Unmarshal(bytes, j)
}

// StringSlice for handling []string columns
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	return json.Marshal(s)
}

func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into StringSlice", value)
	}

	return json.Unmarshal(bytes, s)
}
