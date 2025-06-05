package models

import "time"

type UserSession struct {
	ID           string     `json:"id" gorm:"primaryKey;type:text"`
	UserID       string     `json:"userId" gorm:"column:user_id;not null;index"`
	Username     string     `json:"username" gorm:"not null"`
	Token        string     `json:"token" gorm:"uniqueIndex;not null"`
	CreatedAt    time.Time  `json:"createdAt" gorm:"not null"`
	LastAccessed time.Time  `json:"lastAccessed" gorm:"column:last_accessed;not null"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty" gorm:"column:expires_at"`
	IsActive     bool       `json:"isActive" gorm:"column:is_active;default:true"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID;references:ID"`

	BaseModel
}

func (UserSession) TableName() string {
	return "user_sessions_table"
}
