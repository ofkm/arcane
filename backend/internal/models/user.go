package models

import (
	"time"
)

type User struct {
	Username      string      `json:"username" gorm:"uniqueIndex;not null" sortable:"true"`
	PasswordHash  string      `json:"-" gorm:"column:password_hash"`
	DisplayName   *string     `json:"displayName,omitempty" gorm:"column:display_name" sortable:"true"`
	Email         *string     `json:"email,omitempty" sortable:"true"`
	Roles         StringSlice `json:"roles" gorm:"type:text;not null;default:'[]'"`
	OidcSubjectId *string     `json:"oidcSubjectId,omitempty" gorm:"column:oidc_subject_id"`
	LastLogin     *time.Time  `json:"lastLogin,omitempty" gorm:"column:last_login" sortable:"true"`
	Locale        *string     `json:"locale,omitempty" gorm:"column:locale"`

	// OIDC provider tokens
	OidcAccessToken          *string    `json:"-" gorm:"type:text"`
	OidcRefreshToken         *string    `json:"-" gorm:"type:text"`
	OidcAccessTokenExpiresAt *time.Time `json:"-" gorm:"index"`
	BaseModel
}

func (User) TableName() string {
	return "users"
}
