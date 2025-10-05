package dto

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

type ErrorResponse struct {
	Success bool        `json:"success"`
	Error   string      `json:"error"`
	Code    string      `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

func NewSuccessResponse(data interface{}) SuccessResponse {
	return SuccessResponse{
		Success: true,
		Data:    data,
	}
}

func NewSuccessResponseWithMessage(data interface{}, message string) SuccessResponse {
	return SuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	}
}

func NewMessageResponse(message string) SuccessResponse {
	return SuccessResponse{
		Success: true,
		Data:    MessageDto{Message: message},
	}
}

func NewErrorResponse(err string) ErrorResponse {
	return ErrorResponse{
		Success: false,
		Error:   err,
	}
}

func NewErrorResponseWithCode(err string, code string) ErrorResponse {
	return ErrorResponse{
		Success: false,
		Error:   err,
		Code:    code,
	}
}

func NewErrorResponseWithDetails(err string, code string, details interface{}) ErrorResponse {
	return ErrorResponse{
		Success: false,
		Error:   err,
		Code:    code,
		Details: details,
	}
}
