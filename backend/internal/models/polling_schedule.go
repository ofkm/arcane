package models

import "time"

type PollingSchedule struct {
	BaseModel
	ProjectID           *string    `json:"project_id" gorm:"type:uuid;uniqueIndex"`
	NextPollTime        time.Time  `json:"next_poll_time" gorm:"not null"`
	LastPollTime        *time.Time `json:"last_poll_time"`
	LastPollDurationMs  *int       `json:"last_poll_duration_ms"`
	ConsecutiveFailures int        `json:"consecutive_failures" gorm:"default:0"`
}

func (PollingSchedule) TableName() string {
	return "polling_schedules"
}
