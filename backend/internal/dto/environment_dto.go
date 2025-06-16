package dto

type CreateEnvironmentDto struct {
	Hostname    string  `json:"hostname" binding:"required"`
	ApiUrl      string  `json:"apiUrl" binding:"required,url"`
	Description *string `json:"description"`
	Enabled     *bool   `json:"enabled"`
}

type UpdateEnvironmentDto struct {
	Hostname    *string `json:"hostname"`
	ApiUrl      *string `json:"apiUrl"`
	Description *string `json:"description"`
	Enabled     *bool   `json:"enabled"`
}

type TestConnectionDto struct {
	Status  string  `json:"status"`
	Message *string `json:"message,omitempty"`
}
