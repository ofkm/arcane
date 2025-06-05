package models

import "net/http"

type APIErrorCode string

const (
	APIErrorCodeBadRequest          APIErrorCode = "BAD_REQUEST"
	APIErrorCodeUnauthorized        APIErrorCode = "UNAUTHORIZED"
	APIErrorCodeForbidden           APIErrorCode = "FORBIDDEN"
	APIErrorCodeNotFound            APIErrorCode = "NOT_FOUND"
	APIErrorCodeConflict            APIErrorCode = "CONFLICT"
	APIErrorCodeInternalServerError APIErrorCode = "INTERNAL_SERVER_ERROR"
	APIErrorCodeDockerAPIError      APIErrorCode = "DOCKER_API_ERROR"
	APIErrorCodeValidationError     APIErrorCode = "VALIDATION_ERROR"
	APIErrorCodeTimeout             APIErrorCode = "TIMEOUT"
)

type APIErrorResponse struct {
	Success bool         `json:"success"`
	Error   string       `json:"error"`
	Code    APIErrorCode `json:"code"`
	Details interface{}  `json:"details,omitempty"`
}

type APISuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

// Custom error types
type NotFoundError struct {
	Message string
}

func (e *NotFoundError) Error() string {
	return e.Message
}

type ConflictError struct {
	Message string
}

func (e *ConflictError) Error() string {
	return e.Message
}

type DockerAPIError struct {
	Message    string
	StatusCode int
	Details    interface{}
}

func (e *DockerAPIError) Error() string {
	return e.Message
}

func (e *DockerAPIError) HTTPStatus() int {
	if e.StatusCode > 0 {
		return e.StatusCode
	}
	return http.StatusInternalServerError
}

type ValidationError struct {
	Message string
	Field   string
}

func (e *ValidationError) Error() string {
	return e.Message
}
