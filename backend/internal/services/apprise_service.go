package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v5"
	"github.com/go-playground/validator/v10"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

// AppriseService provides comprehensive notification provider support
type AppriseService struct {
	db          *database.DB
	providerReg *ProviderRegistry
	validator   *validator.Validate
	httpClient  *http.Client
}

// ProviderRegistry manages all notification providers
type ProviderRegistry struct {
	providers map[models.NotificationProvider]Provider
}

// Provider interface for notification providers
type Provider interface {
	Name() models.NotificationProvider
	Category() models.ProviderCategory
	ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error)
	SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error
	GetConfigSchema() map[string]models.ParamDef
}

// NewAppriseService creates a new Apprise service
func NewAppriseService(db *database.DB) *AppriseService {
	registry := NewProviderRegistry()
	return &AppriseService{
		db:          db,
		providerReg: registry,
		validator:   validator.New(),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// NewProviderRegistry creates a new provider registry with all supported providers
func NewProviderRegistry() *ProviderRegistry {
	registry := &ProviderRegistry{
		providers: make(map[models.NotificationProvider]Provider),
	}

	// Register all providers
	registry.registerProvider(NewAppriseProvider())
	registry.registerProvider(NewSlackProvider())
	registry.registerProvider(NewTeamsProvider())
	registry.registerProvider(NewTelegramProvider())
	registry.registerProvider(NewWhatsAppProvider())
	registry.registerProvider(NewSignalProvider())
	registry.registerProvider(NewPushbulletProvider())
	registry.registerProvider(NewPushoverProvider())
	registry.registerProvider(NewProwlProvider())
	registry.registerProvider(NewDesktopProvider())
	registry.registerProvider(NewWebhookProvider())
	registry.registerProvider(NewJSONProvider())
	registry.registerProvider(NewXMLProvider())
	registry.registerProvider(NewRSSProvider())
	registry.registerProvider(NewMatrixProvider())
	registry.registerProvider(NewRocketProvider())
	registry.registerProvider(NewMattermostProvider())
	registry.registerProvider(NewZulipProvider())
	registry.registerProvider(NewGmailProvider())
	registry.registerProvider(NewOutlookProvider())
	registry.registerProvider(NewSendGridProvider())
	registry.registerProvider(NewMailgunProvider())
	registry.registerProvider(NewS3Provider())
	registry.registerProvider(NewDropboxProvider())
	registry.registerProvider(NewDriveProvider())
	registry.registerProvider(NewOneDriveProvider())

	return registry
}

// getAppriseConfigSchema returns the configuration schema for Apprise provider
func getAppriseConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"appriseUrls": {
			Name:        "appriseUrls",
			DisplayName: "Apprise URLs",
			Type:        "array",
			Required:    true,
			Description: "Array of Apprise URLs for notification services",
			Example:     "[]string{\"tgram://bot:token/chat\", \"discord://webhook_id/webhook_token\"}",
		},
		"format": {
			Name:        "format",
			DisplayName: "Message Format",
			Type:        "string",
			Required:    false,
			Description: "Message format (text, html, markdown)",
			Example:     "text",
		},
		"priority": {
			Name:        "priority",
			DisplayName: "Priority",
			Type:        "string",
			Required:    false,
			Description: "Message priority (low, normal, high)",
			Example:     "normal",
		},
		"tags": {
			Name:        "tags",
			DisplayName: "Tags",
			Type:        "array",
			Required:    false,
			Description: "Apprise tags for message categorization",
			Example:     "[]string{\"production\", \"alerts\"}",
		},
	}
}

// getDiscordConfigSchema returns the configuration schema for Discord provider
func getDiscordConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"webhookURL": {
			Name:        "webhookURL",
			DisplayName: "Discord Webhook URL",
			Type:        "string",
			Required:    true,
			Description: "Discord webhook URL for sending messages to channels",
			Example:     "https://discord.com/api/webhooks/123456789/channel_id/webhook_token",
		},
		"username": {
			Name:        "username",
			DisplayName: "Bot Username",
			Type:        "string",
			Required:    false,
			Description: "Username for the Discord bot (max 32 characters)",
			Example:     "Arcane Bot",
		},
		"avatarURL": {
			Name:        "avatarURL",
			DisplayName: "Avatar URL",
			Type:        "string",
			Required:    false,
			Description: "URL for the bot's avatar image",
			Example:     "https://example.com/avatar.png",
		},
		"content": {
			Name:        "content",
			DisplayName: "Default Content",
			Type:        "string",
			Required:    false,
			Description: "Default message content to send with notifications",
			Example:     "Notification from Arcane",
		},
	}
}

// getEmailConfigSchema returns the configuration schema for Email provider
func getEmailConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"smtpHost": {
			Name:        "smtpHost",
			DisplayName: "SMTP Host",
			Type:        "string",
			Required:    true,
			Description: "SMTP server hostname",
			Example:     "smtp.gmail.com",
		},
		"smtpPort": {
			Name:        "smtpPort",
			DisplayName: "SMTP Port",
			Type:        "integer",
			Required:    true,
			Description: "SMTP server port (usually 587 for TLS or 465 for SSL)",
			Example:     "587",
		},
		"fromAddress": {
			Name:        "fromAddress",
			DisplayName: "From Address",
			Type:        "string",
			Required:    true,
			Description: "Email address to send from",
			Example:     "noreply@example.com",
		},
		"fromName": {
			Name:        "fromName",
			DisplayName: "From Name",
			Type:        "string",
			Required:    false,
			Description: "Display name for the sender",
			Example:     "Arcane Notifications",
		},
		"toAddresses": {
			Name:        "toAddresses",
			DisplayName: "To Addresses",
			Type:        "array",
			Required:    true,
			Description: "Array of recipient email addresses",
			Example:     "[]string{\"user@example.com\", \"admin@example.com\"}",
		},
		"username": {
			Name:        "username",
			DisplayName: "Username",
			Type:        "string",
			Required:    false,
			Description: "SMTP authentication username (if different from fromAddress)",
			Example:     "noreply@example.com",
		},
		"password": {
			Name:        "password",
			DisplayName: "Password",
			Type:        "string",
			Required:    false,
			Description: "SMTP authentication password or app password",
			Example:     "app-specific-password",
		},
		"useTLS": {
			Name:        "useTLS",
			DisplayName: "Use TLS",
			Type:        "boolean",
			Required:    false,
			Description: "Use TLS encryption (recommended for port 587)",
			Example:     "true",
		},
		"useSSL": {
			Name:        "useSSL",
			DisplayName: "Use SSL",
			Type:        "boolean",
			Required:    false,
			Description: "Use SSL encryption (for port 465)",
			Example:     "false",
		},
	}
}

func (r *ProviderRegistry) registerProvider(provider Provider) {
	r.providers[provider.Name()] = provider
}

// GetProvider retrieves a provider by name
func (r *ProviderRegistry) GetProvider(name models.NotificationProvider) (Provider, bool) {
	provider, exists := r.providers[name]
	return provider, exists
}

// GetAllProviders returns all registered providers
func (r *ProviderRegistry) GetAllProviders() []Provider {
	providers := make([]Provider, 0, len(r.providers))
	for _, provider := range r.providers {
		providers = append(providers, provider)
	}
	return providers
}

// GetProvidersByCategory returns providers by category
func (r *ProviderRegistry) GetProvidersByCategory(category models.ProviderCategory) []Provider {
	var providers []Provider
	for _, provider := range r.providers {
		if provider.Category() == category {
			providers = append(providers, provider)
		}
	}
	return providers
}

// ValidateProvider validates a provider configuration
func (s *AppriseService) ValidateProvider(ctx context.Context, provider models.NotificationProvider, config models.JSON) (*models.ProviderValidationResult, error) {
	// First check if it's a legacy provider
	if provider == models.NotificationProviderDiscord {
		return s.validateDiscordConfig(ctx, config)
	}
	if provider == models.NotificationProviderEmail {
		return s.validateEmailConfig(ctx, config)
	}

	// Check if it's a registered Apprise provider
	prov, exists := s.providerReg.GetProvider(provider)
	if !exists {
		return &models.ProviderValidationResult{
			Provider: provider,
			Valid:    false,
			Errors:   []string{"Unsupported provider"},
		}, nil
	}

	return prov.ValidateConfig(config)
}

// SendNotification sends a notification using the specified provider
func (s *AppriseService) SendNotification(ctx context.Context, provider models.NotificationProvider, msg *models.NotificationMessage, config models.JSON) error {
	// First check if it's a legacy provider and handle accordingly
	if provider == models.NotificationProviderDiscord {
		return s.sendDiscordNotification(ctx, msg, config)
	}
	if provider == models.NotificationProviderEmail {
		return s.sendEmailNotification(ctx, msg, config)
	}

	// Check if it's a registered Apprise provider
	prov, exists := s.providerReg.GetProvider(provider)
	if !exists {
		return fmt.Errorf("unsupported provider: %s", provider)
	}

	// Validate configuration first
	validation, err := prov.ValidateConfig(config)
	if err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}
	if !validation.Valid {
		return fmt.Errorf("configuration invalid: %s", strings.Join(validation.Errors, ", "))
	}

	return prov.SendMessage(ctx, msg, config)
}

// Legacy notification methods for backward compatibility
func (s *AppriseService) sendDiscordNotification(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	// Implementation for Discord notifications
	// This would send to Discord via webhook
	return fmt.Errorf("Discord notification not fully implemented")
}

func (s *AppriseService) sendEmailNotification(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	// Implementation for email notifications
	// This would send via SMTP
	return fmt.Errorf("Email notification not fully implemented")
}

// SendBatchNotifications sends notifications to multiple providers
func (s *AppriseService) SendBatchNotifications(ctx context.Context, msg *models.NotificationMessage, providerConfigs map[models.NotificationProvider]models.JSON) error {
	var errors []string

	for provider, config := range providerConfigs {
		if err := s.SendNotification(ctx, provider, msg, config); err != nil {
			errors = append(errors, fmt.Sprintf("%s: %s", provider, err.Error()))
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("batch notification errors: %s", strings.Join(errors, "; "))
	}

	return nil
}

// TestProvider tests a provider configuration
func (s *AppriseService) TestProvider(ctx context.Context, provider models.NotificationProvider, config models.JSON) error {
	testMsg := &models.NotificationMessage{
		Title:    "Test Notification",
		Body:     "This is a test notification from Arcane",
		Format:   "text",
		Priority: "normal",
		Metadata: map[string]string{
			"test":      "true",
			"timestamp": time.Now().Format(time.RFC3339),
		},
	}

	return s.SendNotification(ctx, provider, testMsg, config)
}

// GetProviderSchema returns the configuration schema for a provider
func (s *AppriseService) GetProviderSchema(provider models.NotificationProvider) (map[string]models.ParamDef, error) {
	// Check if it's a legacy provider
	if provider == models.NotificationProviderDiscord {
		return getDiscordConfigSchema(), nil
	}
	if provider == models.NotificationProviderEmail {
		return getEmailConfigSchema(), nil
	}

	// Check Apprise providers
	prov, exists := s.providerReg.GetProvider(provider)
	if !exists {
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}

	return prov.GetConfigSchema(), nil
}

// GetAllProviderMetadata returns metadata for all supported providers
func (s *AppriseService) GetAllProviderMetadata() []models.ProviderMetadata {
	metadata := make([]models.ProviderMetadata, 0)

	// Add generic Apprise provider first (to show it prominently)
	appriseMetadata := models.ProviderMetadata{
		Name:        string(models.NotificationProviderApprise),
		DisplayName: "Apprise (Generic)",
		Category:    string(models.ProviderCategoryCustom),
		Description: "Send notifications using Apprise URLs for multiple providers",
		AuthTypes:   []string{"url"},
		Enabled:     true,
		Parameters:  getAppriseConfigSchema(),
	}
	metadata = append(metadata, appriseMetadata)

	// Add legacy Discord provider
	discordMetadata := models.ProviderMetadata{
		Name:        string(models.NotificationProviderDiscord),
		DisplayName: "Discord",
		Category:    string(models.ProviderCategoryChat),
		Description: "Send notifications to Discord channels via webhooks",
		AuthTypes:   []string{"webhook"},
		Enabled:     true,
		Parameters:  getDiscordConfigSchema(),
	}
	metadata = append(metadata, discordMetadata)

	// Add legacy Email provider
	emailMetadata := models.ProviderMetadata{
		Name:        string(models.NotificationProviderEmail),
		DisplayName: "Email",
		Category:    string(models.ProviderCategoryEmail),
		Description: "Send email notifications via SMTP",
		AuthTypes:   []string{"smtp"},
		Enabled:     true,
		Parameters:  getEmailConfigSchema(),
	}
	metadata = append(metadata, emailMetadata)

	// Add Apprise providers with their schemas
	for _, provider := range s.providerReg.GetAllProviders() {
		// Skip the generic Apprise provider as we already added it above
		if provider.Name() == models.NotificationProviderApprise {
			continue
		}

		providerMetadata := models.ProviderMetadata{
			Name:        string(provider.Name()),
			DisplayName: getProviderDisplayName(provider.Name()),
			Category:    string(provider.Category()),
			Description: getProviderDescription(provider.Name()),
			AuthTypes:   getProviderAuthTypes(provider.Name()),
			Enabled:     true,
			Parameters:  provider.GetConfigSchema(),
		}
		metadata = append(metadata, providerMetadata)
	}

	return metadata
}

// Helper functions for provider metadata
func getProviderDisplayName(provider models.NotificationProvider) string {
	switch provider {
	case models.NotificationProviderSlack:
		return "Slack"
	case models.NotificationProviderTeams:
		return "Microsoft Teams"
	case models.NotificationProviderTelegram:
		return "Telegram"
	case models.NotificationProviderWhatsApp:
		return "WhatsApp"
	case models.NotificationProviderSignal:
		return "Signal"
	case models.NotificationProviderPushbullet:
		return "Pushbullet"
	case models.NotificationProviderPushover:
		return "Pushover"
	case models.NotificationProviderProwl:
		return "Prowl"
	case models.NotificationProviderDesktop:
		return "Desktop"
	case models.NotificationProviderWebhook:
		return "Webhook"
	case models.NotificationProviderJSON:
		return "JSON"
	case models.NotificationProviderXML:
		return "XML"
	case models.NotificationProviderRSS:
		return "RSS"
	case models.NotificationProviderMatrix:
		return "Matrix"
	case models.NotificationProviderRocket:
		return "Rocket.Chat"
	case models.NotificationProviderMattermost:
		return "Mattermost"
	case models.NotificationProviderZulip:
		return "Zulip"
	case models.NotificationProviderGmail:
		return "Gmail"
	case models.NotificationProviderOutlook:
		return "Outlook"
	case models.NotificationProviderSendGrid:
		return "SendGrid"
	case models.NotificationProviderMailgun:
		return "Mailgun"
	case models.NotificationProviderS3:
		return "AWS S3"
	case models.NotificationProviderDropbox:
		return "Dropbox"
	case models.NotificationProviderDrive:
		return "Google Drive"
	case models.NotificationProviderOneDrive:
		return "OneDrive"
	default:
		return string(provider)
	}
}

func getProviderDescription(provider models.NotificationProvider) string {
	switch provider {
	case models.NotificationProviderSlack:
		return "Send notifications to Slack channels via webhooks or bot tokens"
	case models.NotificationProviderTeams:
		return "Send notifications to Microsoft Teams channels via webhooks"
	case models.NotificationProviderTelegram:
		return "Send notifications to Telegram chats via bot API"
	case models.NotificationProviderWhatsApp:
		return "Send notifications via WhatsApp"
	case models.NotificationProviderSignal:
		return "Send notifications via Signal"
	case models.NotificationProviderPushbullet:
		return "Send push notifications via Pushbullet"
	case models.NotificationProviderPushover:
		return "Send push notifications via Pushover"
	case models.NotificationProviderProwl:
		return "Send push notifications via Prowl"
	case models.NotificationProviderDesktop:
		return "Send desktop notifications"
	case models.NotificationProviderWebhook:
		return "Send notifications to generic webhooks with customizable payloads"
	case models.NotificationProviderJSON:
		return "Send notifications to JSON endpoints"
	case models.NotificationProviderXML:
		return "Send notifications to XML endpoints"
	case models.NotificationProviderRSS:
		return "Publish notifications to RSS feeds"
	case models.NotificationProviderMatrix:
		return "Send notifications to Matrix rooms"
	case models.NotificationProviderRocket:
		return "Send notifications to Rocket.Chat"
	case models.NotificationProviderMattermost:
		return "Send notifications to Mattermost"
	case models.NotificationProviderZulip:
		return "Send notifications to Zulip"
	case models.NotificationProviderGmail:
		return "Send email notifications via Gmail"
	case models.NotificationProviderOutlook:
		return "Send email notifications via Outlook"
	case models.NotificationProviderSendGrid:
		return "Send email notifications via SendGrid"
	case models.NotificationProviderMailgun:
		return "Send email notifications via Mailgun"
	case models.NotificationProviderS3:
		return "Store notifications in AWS S3"
	case models.NotificationProviderDropbox:
		return "Store notifications in Dropbox"
	case models.NotificationProviderDrive:
		return "Store notifications in Google Drive"
	case models.NotificationProviderOneDrive:
		return "Store notifications in OneDrive"
	default:
		return "Notification provider"
	}
}

func getProviderAuthTypes(provider models.NotificationProvider) []string {
	switch provider {
	case models.NotificationProviderDiscord, models.NotificationProviderSlack, models.NotificationProviderTeams, models.NotificationProviderWebhook:
		return []string{"webhook"}
	case models.NotificationProviderTelegram, models.NotificationProviderWhatsApp, models.NotificationProviderSignal, models.NotificationProviderPushbullet, models.NotificationProviderPushover, models.NotificationProviderProwl:
		return []string{"api_key"}
	case models.NotificationProviderGmail, models.NotificationProviderOutlook, models.NotificationProviderSendGrid, models.NotificationProviderMailgun:
		return []string{"smtp", "api_key"}
	case models.NotificationProviderS3, models.NotificationProviderDropbox, models.NotificationProviderDrive, models.NotificationProviderOneDrive:
		return []string{"oauth", "api_key"}
	default:
		return []string{"api_key"}
	}
}

// Helper functions for configuration validation
func (s *AppriseService) validateDiscordConfig(ctx context.Context, config models.JSON) (*models.ProviderValidationResult, error) {
	var discordConfig models.DiscordConfig
	configBytes, err := json.Marshal(config)
	if err != nil {
		return &models.ProviderValidationResult{
			Provider: models.NotificationProviderDiscord,
			Valid:    false,
			Errors:   []string{fmt.Sprintf("Invalid JSON: %v", err)},
		}, nil
	}

	if err := json.Unmarshal(configBytes, &discordConfig); err != nil {
		return &models.ProviderValidationResult{
			Provider: models.NotificationProviderDiscord,
			Valid:    false,
			Errors:   []string{fmt.Sprintf("Invalid config format: %v", err)},
		}, nil
	}

	var errors, warnings []string

	if discordConfig.WebhookURL == "" {
		errors = append(errors, "Webhook URL is required")
	} else {
		if err := s.validateDiscordWebhookURL(discordConfig.WebhookURL); err != nil {
			warnings = append(warnings, fmt.Sprintf("Webhook URL validation: %v", err))
		}
	}

	if discordConfig.Username != "" && len(discordConfig.Username) > 32 {
		warnings = append(warnings, "Username should be 32 characters or less")
	}

	return &models.ProviderValidationResult{
		Provider: models.NotificationProviderDiscord,
		Valid:    len(errors) == 0,
		Errors:   errors,
		Warnings: warnings,
	}, nil
}

func (s *AppriseService) validateEmailConfig(ctx context.Context, config models.JSON) (*models.ProviderValidationResult, error) {
	var emailConfig models.EmailConfig
	configBytes, err := json.Marshal(config)
	if err != nil {
		return &models.ProviderValidationResult{
			Provider: models.NotificationProviderEmail,
			Valid:    false,
			Errors:   []string{fmt.Sprintf("Invalid JSON: %v", err)},
		}, nil
	}

	if err := json.Unmarshal(configBytes, &emailConfig); err != nil {
		return &models.ProviderValidationResult{
			Provider: models.NotificationProviderEmail,
			Valid:    false,
			Errors:   []string{fmt.Sprintf("Invalid config format: %v", err)},
		}, nil
	}

	var errors, warnings []string

	if emailConfig.SMTPHost == "" {
		errors = append(errors, "SMTP host is required")
	}

	if emailConfig.SMTPPort <= 0 || emailConfig.SMTPPort > 65535 {
		errors = append(errors, "Valid SMTP port is required")
	}

	if emailConfig.FromAddress == "" {
		errors = append(errors, "From address is required")
	} else {
		if _, err := mail.ParseAddress(emailConfig.FromAddress); err != nil {
			errors = append(errors, "Invalid from address format")
		}
	}

	if len(emailConfig.ToAddresses) == 0 {
		errors = append(errors, "At least one recipient address is required")
	} else {
		for _, addr := range emailConfig.ToAddresses {
			if _, err := mail.ParseAddress(addr); err != nil {
				errors = append(errors, fmt.Sprintf("Invalid to address: %s", addr))
			}
		}
	}

	return &models.ProviderValidationResult{
		Provider: models.NotificationProviderEmail,
		Valid:    len(errors) == 0,
		Errors:   errors,
		Warnings: warnings,
	}, nil
}

func (s *AppriseService) validateDiscordWebhookURL(webhookURL string) error {
	parsedURL, err := url.Parse(webhookURL)
	if err != nil {
		return fmt.Errorf("failed to parse webhook URL: %w", err)
	}

	if parsedURL.Scheme != "https" {
		return fmt.Errorf("webhook URL must use HTTPS")
	}

	validHosts := []string{"discord.com", "discordapp.com"}
	isValid := false
	for _, validHost := range validHosts {
		if parsedURL.Host == validHost || strings.HasSuffix(parsedURL.Host, "."+validHost) {
			isValid = true
			break
		}
	}

	if !isValid {
		return fmt.Errorf("webhook URL must be a Discord webhook URL")
	}

	if !strings.HasPrefix(parsedURL.Path, "/api/webhooks/") {
		return fmt.Errorf("invalid Discord webhook path")
	}

	return nil
}

// ExecuteWithRetry executes a function with exponential backoff retry
func (s *AppriseService) ExecuteWithRetry(ctx context.Context, operation func() error) error {
	_, err := backoff.Retry(
		ctx,
		func() (struct{}, error) {
			return struct{}{}, operation()
		},
		backoff.WithBackOff(backoff.NewExponentialBackOff()),
		backoff.WithMaxTries(3),
	)
	return err
}

// Close closes the Apprise service and releases resources
func (s *AppriseService) Close() {
	if s.httpClient != nil {
		s.httpClient.CloseIdleConnections()
	}
}
