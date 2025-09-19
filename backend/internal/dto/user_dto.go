package dto

type CreateUserDto struct {
	Username    string   `json:"username" binding:"required"`
	Password    string   `json:"password" binding:"required"`
	DisplayName *string  `json:"displayName,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Roles       []string `json:"roles,omitempty"`
	Locale      *string  `json:"locale,omitempty"`
}

type UpdateUserDto struct {
	DisplayName *string  `json:"displayName,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Roles       []string `json:"roles,omitempty"`
	Locale      *string  `json:"locale,omitempty"`
	Password    *string  `json:"password,omitempty"`
}

type UserResponseDto struct {
	ID            string   `json:"id"`
	Username      string   `json:"username"`
	DisplayName   *string  `json:"displayName,omitempty"`
	Email         *string  `json:"email,omitempty"`
	Roles         []string `json:"roles"`
	OidcSubjectId *string  `json:"oidcSubjectId,omitempty"`
	Locale        *string  `json:"locale,omitempty"`
	CreatedAt     string   `json:"createdAt,omitempty"`
	UpdatedAt     string   `json:"updatedAt,omitempty"`
}
