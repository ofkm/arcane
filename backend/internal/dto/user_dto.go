package dto

type CreateUserDto struct {
	Username    string   `json:"username" binding:"required"`
	Password    string   `json:"password" binding:"required"`
	DisplayName *string  `json:"displayName,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Roles       []string `json:"roles,omitempty"`
}

type UpdateUserDto struct {
	DisplayName *string  `json:"displayName,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Roles       []string `json:"roles,omitempty"`
}
