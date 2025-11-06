package models

import (
	"time"
)

type NotificationProvider string

const (
	// Legacy providers (kept for backward compatibility)
	NotificationProviderDiscord NotificationProvider = "discord"
	NotificationProviderEmail   NotificationProvider = "email"

	// Apprise-style providers
	NotificationProviderApprise    NotificationProvider = "apprise"
	NotificationProviderSlack      NotificationProvider = "slack"
	NotificationProviderTeams      NotificationProvider = "teams"
	NotificationProviderTelegram   NotificationProvider = "telegram"
	NotificationProviderWhatsApp   NotificationProvider = "whatsapp"
	NotificationProviderSignal     NotificationProvider = "signal"
	NotificationProviderPushbullet NotificationProvider = "pushbullet"
	NotificationProviderPushover   NotificationProvider = "pushover"
	NotificationProviderProwl      NotificationProvider = "prowl"
	NotificationProviderDesktop    NotificationProvider = "desktop"
	NotificationProviderWebhook    NotificationProvider = "webhook"
	NotificationProviderJSON       NotificationProvider = "json"
	NotificationProviderXML        NotificationProvider = "xml"
	NotificationProviderRSS        NotificationProvider = "rss"
	NotificationProviderMatrix     NotificationProvider = "matrix"
	NotificationProviderRocket     NotificationProvider = "rocket"
	NotificationProviderMattermost NotificationProvider = "mattermost"
	NotificationProviderZulip      NotificationProvider = "zulip"
	NotificationProviderGmail      NotificationProvider = "gmail"
	NotificationProviderOutlook    NotificationProvider = "outlook"
	NotificationProviderSendGrid   NotificationProvider = "sendgrid"
	NotificationProviderMailgun    NotificationProvider = "mailgun"
	NotificationProviderS3         NotificationProvider = "s3"
	NotificationProviderDropbox    NotificationProvider = "dropbox"
	NotificationProviderDrive      NotificationProvider = "drive"
	NotificationProviderOneDrive   NotificationProvider = "onedrive"
)

type NotificationEventType string

const (
	NotificationEventImageUpdate     NotificationEventType = "image_update"
	NotificationEventContainerUpdate NotificationEventType = "container_update"
	NotificationEventSystemError     NotificationEventType = "system_error"
	NotificationEventSecurityAlert   NotificationEventType = "security_alert"
)

type EmailTLSMode string

const (
	EmailTLSModeNone     EmailTLSMode = "none"
	EmailTLSModeStartTLS EmailTLSMode = "starttls"
	EmailTLSModeSSL      EmailTLSMode = "ssl"
)

type NotificationSettings struct {
	ID               uint                 `json:"id" gorm:"primaryKey"`
	Provider         NotificationProvider `json:"provider" gorm:"not null;index;type:varchar(50)"`
	Enabled          bool                 `json:"enabled" gorm:"default:false"`
	Config           JSON                 `json:"config" gorm:"type:jsonb"`
	AppriseURLs      []string             `json:"appriseUrls" gorm:"type:jsonb"`          // For Apprise-style configurations
	Label            string               `json:"label"`                                  // Custom label for provider
	Tags             []string             `json:"tags" gorm:"type:jsonb;serializer:json"` // Apprise tags
	ValidationStatus string               `json:"validationStatus"`                       // last validation status
	LastValidatedAt  *time.Time           `json:"lastValidatedAt,omitempty"`
	CreatedAt        time.Time            `json:"createdAt"`
	UpdatedAt        time.Time            `json:"updatedAt"`
}

func (NotificationSettings) TableName() string {
	return "notification_settings"
}

type NotificationLog struct {
	ID        uint                 `json:"id" gorm:"primaryKey"`
	Provider  NotificationProvider `json:"provider" gorm:"not null;index;type:varchar(50)"`
	ImageRef  string               `json:"imageRef" gorm:"not null"`
	Status    string               `json:"status" gorm:"not null"`
	Error     *string              `json:"error,omitempty"`
	Metadata  JSON                 `json:"metadata" gorm:"type:jsonb"`
	SentAt    time.Time            `json:"sentAt" gorm:"not null;index"`
	CreatedAt time.Time            `json:"createdAt"`
	UpdatedAt time.Time            `json:"updatedAt"`
}

func (NotificationLog) TableName() string {
	return "notification_logs"
}

type ProviderMetadata struct {
	ID          uint                `json:"id" gorm:"primaryKey"`
	Name        string              `json:"name" gorm:"not null;unique;type:varchar(100)"`
	DisplayName string              `json:"displayName"`
	Category    string              `json:"category"`
	Description string              `json:"description"`
	URLFormat   string              `json:"urlFormat"`
	Parameters  map[string]ParamDef `json:"parameters"`
	AuthTypes   []string            `json:"authTypes"`
	Tags        []string            `json:"tags"`
	Examples    []string            `json:"examples"`
	Enabled     bool                `json:"enabled"`
	CreatedAt   time.Time           `json:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt"`
}

func (ProviderMetadata) TableName() string {
	return "provider_metadata"
}

type ParamDef struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Type        string `json:"type"` // string, int, bool, url, email, etc.
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     string `json:"example"`
	Placeholder string `json:"placeholder"`
	Validation  string `json:"validation"` // regex or other validation rules
}

// Legacy configurations (kept for backward compatibility)
type DiscordConfig struct {
	WebhookURL string                         `json:"webhookUrl"`
	Username   string                         `json:"username,omitempty"`
	AvatarURL  string                         `json:"avatarUrl,omitempty"`
	Events     map[NotificationEventType]bool `json:"events,omitempty"`
}

type EmailConfig struct {
	SMTPHost     string                         `json:"smtpHost"`
	SMTPPort     int                            `json:"smtpPort"`
	SMTPUsername string                         `json:"smtpUsername"`
	SMTPPassword string                         `json:"smtpPassword"`
	FromAddress  string                         `json:"fromAddress"`
	ToAddresses  []string                       `json:"toAddresses"`
	TLSMode      EmailTLSMode                   `json:"tlsMode"`
	Events       map[NotificationEventType]bool `json:"events,omitempty"`
}

// Apprise-style configuration
type AppriseConfig struct {
	URLs      []string                       `json:"urls"`
	Tags      []string                       `json:"tags,omitempty"`
	Label     string                         `json:"label,omitempty"`
	Events    map[NotificationEventType]bool `json:"events,omitempty"`
	Format    string                         `json:"format,omitempty"`   // json, yaml, text, etc.
	Priority  string                         `json:"priority,omitempty"` // low, normal, high
	Click     string                         `json:"click,omitempty"`    // clickable URL
	VerifySSL bool                           `json:"verify_ssl,omitempty"`
	Timeout   int                            `json:"timeout,omitempty"`
	Retries   int                            `json:"retries,omitempty"`
}

// Notification message structure
type NotificationMessage struct {
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Format   string            `json:"format,omitempty"`
	Tags     []string          `json:"tags,omitempty"`
	Priority string            `json:"priority,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// Provider validation result
type ProviderValidationResult struct {
	Provider NotificationProvider `json:"provider"`
	Valid    bool                 `json:"valid"`
	Message  string               `json:"message,omitempty"`
	Errors   []string             `json:"errors,omitempty"`
	Warnings []string             `json:"warnings,omitempty"`
}

// Provider category constants
type ProviderCategory string

const (
	ProviderCategoryChat    ProviderCategory = "chat"
	ProviderCategoryEmail   ProviderCategory = "email"
	ProviderCategoryMobile  ProviderCategory = "mobile"
	ProviderCategoryDesktop ProviderCategory = "desktop"
	ProviderCategoryWeb     ProviderCategory = "web"
	ProviderCategoryCloud   ProviderCategory = "cloud"
	ProviderCategoryCustom  ProviderCategory = "custom"
	ProviderCategoryWebhook ProviderCategory = "webhook"
	ProviderCategoryFeed    ProviderCategory = "feed"
)
