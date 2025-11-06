package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/models"
)

// BaseProvider provides common functionality for all providers
type BaseProvider struct {
	name     models.NotificationProvider
	category models.ProviderCategory
}

func (p *BaseProvider) Name() models.NotificationProvider {
	return p.name
}

func (p *BaseProvider) Category() models.ProviderCategory {
	return p.category
}

// SlackProvider handles Slack notifications
type SlackProvider struct {
	BaseProvider
}

func NewSlackProvider() *SlackProvider {
	return &SlackProvider{
		BaseProvider: BaseProvider{
			name:     models.NotificationProviderSlack,
			category: models.ProviderCategoryChat,
		},
	}
}

func (p *SlackProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	var result models.ProviderValidationResult
	result.Provider = p.Name()

	// Slack supports webhook URLs and bot tokens
	// For webhook URLs, we validate the format
	if webhookURL, ok := config["webhookUrl"]; ok {
		if err := validateSlackWebhookURL(webhookURL.(string)); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Invalid webhook URL: %v", err))
		}
	}

	// For bot tokens, validate format
	if token, ok := config["botToken"]; ok {
		if !strings.HasPrefix(token.(string), "xoxb-") && !strings.HasPrefix(token.(string), "xoxp-") {
			result.Errors = append(result.Errors, "Invalid Slack bot token format")
		}
	}

	result.Valid = len(result.Errors) == 0
	return &result, nil
}

func (p *SlackProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	// Implementation for Slack notifications
	// This would send to Slack via webhook or bot API
	return fmt.Errorf("Slack provider not fully implemented")
}

func (p *SlackProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"webhookUrl": {
			Name:        "webhookUrl",
			DisplayName: "Webhook URL",
			Type:        "url",
			Required:    true,
			Description: "Slack webhook URL for incoming webhooks",
			Example:     "https://hooks.slack.com/services/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN",
		},
		"botToken": {
			Name:        "botToken",
			DisplayName: "Bot Token",
			Type:        "string",
			Required:    false,
			Description: "Slack bot token for API access",
			Example:     "xoxb-YOUR_BOT_TOKEN",
		},
		"channel": {
			Name:        "channel",
			DisplayName: "Channel",
			Type:        "string",
			Required:    false,
			Description: "Target channel or user",
			Example:     "#general or @username",
		},
		"username": {
			Name:        "username",
			DisplayName: "Username",
			Type:        "string",
			Required:    false,
			Description: "Bot username override",
			Example:     "Arcane",
		},
	}
}

// TeamsProvider handles Microsoft Teams notifications
type TeamsProvider struct {
	BaseProvider
}

func NewTeamsProvider() *TeamsProvider {
	return &TeamsProvider{
		BaseProvider: BaseProvider{
			name:     models.NotificationProviderTeams,
			category: models.ProviderCategoryChat,
		},
	}
}

func (p *TeamsProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	result := &models.ProviderValidationResult{
		Provider: p.Name(),
	}

	if webhookURL, ok := config["webhookUrl"]; ok {
		if err := validateTeamsWebhookURL(webhookURL.(string)); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Invalid webhook URL: %v", err))
		}
	}

	result.Valid = len(result.Errors) == 0
	return result, nil
}

func (p *TeamsProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("Teams provider not fully implemented")
}

func (p *TeamsProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"webhookUrl": {
			Name:        "webhookUrl",
			DisplayName: "Webhook URL",
			Type:        "url",
			Required:    true,
			Description: "Teams incoming webhook URL",
			Example:     "https://outlook.office.com/webhook/...",
		},
	}
}

// TelegramProvider handles Telegram notifications
type TelegramProvider struct {
	BaseProvider
}

func NewTelegramProvider() *TelegramProvider {
	return &TelegramProvider{
		BaseProvider: BaseProvider{
			name:     models.NotificationProviderTelegram,
			category: models.ProviderCategoryChat,
		},
	}
}

func (p *TelegramProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	result := &models.ProviderValidationResult{
		Provider: p.Name(),
	}

	botToken := config["botToken"]
	if botToken == "" {
		result.Errors = append(result.Errors, "Bot token is required")
	} else {
		tokenStr := botToken.(string)
		if !strings.Contains(tokenStr, ":") || len(tokenStr) < 40 {
			result.Errors = append(result.Errors, "Invalid bot token format")
		}
	}

	chatID := config["chatId"]
	if chatID == "" {
		result.Errors = append(result.Errors, "Chat ID is required")
	}

	result.Valid = len(result.Errors) == 0
	return result, nil
}

func (p *TelegramProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("Telegram provider not fully implemented")
}

func (p *TelegramProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"botToken": {
			Name:        "botToken",
			DisplayName: "Bot Token",
			Type:        "string",
			Required:    true,
			Description: "Telegram bot token from @BotFather",
			Example:     "1234567890:ABCdefGhIJKlmNoPQRsTuVwXyZ",
		},
		"chatId": {
			Name:        "chatId",
			DisplayName: "Chat ID",
			Type:        "string",
			Required:    true,
			Description: "Telegram chat ID",
			Example:     "123456789 or -1001234567890",
		},
	}
}

// WebhookProvider handles generic webhook notifications
type WebhookProvider struct {
	BaseProvider
}

func NewWebhookProvider() *WebhookProvider {
	return &WebhookProvider{
		BaseProvider: BaseProvider{
			name:     models.NotificationProviderWebhook,
			category: models.ProviderCategoryWebhook,
		},
	}
}

func (p *WebhookProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	result := &models.ProviderValidationResult{
		Provider: p.Name(),
	}

	if webhookURL, ok := config["url"]; ok {
		if err := validateGenericWebhookURL(webhookURL.(string)); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Invalid webhook URL: %v", err))
		}
	}

	result.Valid = len(result.Errors) == 0
	return result, nil
}

func (p *WebhookProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	webhookURL := config["url"].(string)
	method := "POST"
	if methodOverride, ok := config["method"]; ok {
		method = methodOverride.(string)
	}

	// Prepare payload based on format
	var payload []byte
	var contentType string

	if format, ok := config["format"].(string); ok {
		switch strings.ToLower(format) {
		case "json":
			payload, _ = json.Marshal(map[string]interface{}{
				"title":    msg.Title,
				"body":     msg.Body,
				"format":   msg.Format,
				"priority": msg.Priority,
				"metadata": msg.Metadata,
			})
			contentType = "application/json"
		case "xml":
			// Generate XML payload
			payload = []byte(fmt.Sprintf(`<notification><title>%s</title><body>%s</body></notification>`, msg.Title, msg.Body))
			contentType = "application/xml"
		default:
			payload = []byte(msg.Body)
			contentType = "text/plain"
		}
	} else {
		payload = []byte(msg.Body)
		contentType = "text/plain"
	}

	// Add custom headers
	headers := make(map[string]string)
	if config["headers"] != nil {
		for k, v := range config["headers"].(map[string]interface{}) {
			headers[k] = v.(string)
		}
	}

	return sendWebhook(ctx, webhookURL, method, payload, contentType, headers)
}

func (p *WebhookProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"url": {
			Name:        "url",
			DisplayName: "Webhook URL",
			Type:        "url",
			Required:    true,
			Description: "Target webhook URL",
			Example:     "https://example.com/webhook",
		},
		"method": {
			Name:        "method",
			DisplayName: "HTTP Method",
			Type:        "string",
			Required:    false,
			Description: "HTTP method (GET, POST, PUT)",
			Example:     "POST",
		},
		"format": {
			Name:        "format",
			DisplayName: "Payload Format",
			Type:        "string",
			Required:    false,
			Description: "Payload format (json, xml, text)",
			Example:     "json",
		},
		"headers": {
			Name:        "headers",
			DisplayName: "Custom Headers",
			Type:        "object",
			Required:    false,
			Description: "Custom HTTP headers",
			Example:     `{"Authorization": "Bearer token"}`,
		},
	}
}

// JSONProvider handles JSON format notifications
type JSONProvider struct {
	BaseProvider
}

func NewJSONProvider() *JSONProvider {
	return &JSONProvider{
		BaseProvider: BaseProvider{
			name:     models.NotificationProviderJSON,
			category: models.ProviderCategoryWeb,
		},
	}
}

func (p *JSONProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	result := &models.ProviderValidationResult{
		Provider: p.Name(),
	}

	if config["url"] == "" {
		result.Errors = append(result.Errors, "URL is required")
	}

	result.Valid = len(result.Errors) == 0
	return result, nil
}

func (p *JSONProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("JSON provider not fully implemented")
}

func (p *JSONProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{
		"url": {
			Name:        "url",
			DisplayName: "JSON Endpoint URL",
			Type:        "url",
			Required:    true,
			Description: "JSON endpoint for notifications",
			Example:     "https://api.example.com/notifications",
		},
		"username": {
			Name:        "username",
			DisplayName: "Username",
			Type:        "string",
			Required:    false,
			Description: "Basic auth username",
			Example:     "user",
		},
		"password": {
			Name:        "password",
			DisplayName: "Password",
			Type:        "string",
			Required:    false,
			Description: "Basic auth password",
			Example:     "password",
		},
	}
}

// AppriseProvider handles generic Apprise URLs
type AppriseProvider struct {
	BaseProvider
}

func NewAppriseProvider() *AppriseProvider {
	return &AppriseProvider{
		BaseProvider: BaseProvider{
			name:     models.NotificationProviderApprise,
			category: models.ProviderCategoryCustom,
		},
	}
}

func (p *AppriseProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	result := &models.ProviderValidationResult{
		Provider: p.Name(),
	}

	// Check for Apprise URLs
	appriseURLs := config["appriseUrls"]
	if appriseURLs == nil {
		// Check for single URL field
		if url := config["url"]; url == nil {
			result.Errors = append(result.Errors, "Apprise URL(s) are required")
		}
	} else {
		// Validate each URL
		urls, ok := appriseURLs.([]interface{})
		if !ok {
			result.Errors = append(result.Errors, "Apprise URLs must be an array")
		} else if len(urls) == 0 {
			result.Errors = append(result.Errors, "At least one Apprise URL is required")
		} else {
			for i, url := range urls {
				urlStr, ok := url.(string)
				if !ok {
					result.Errors = append(result.Errors, fmt.Sprintf("URL at index %d must be a string", i))
					continue
				}
				if err := validateAppriseURL(urlStr); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Invalid Apprise URL at index %d: %v", i, err))
				}
			}
		}
	}

	result.Valid = len(result.Errors) == 0
	return result, nil
}

func (p *AppriseProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	appriseURLs, exists := config["appriseUrls"]
	if !exists {
		url, exists := config["url"]
		if !exists {
			return fmt.Errorf("no Apprise URLs configured")
		}
		appriseURLs = []string{url.(string)}
	}

	urls, ok := appriseURLs.([]interface{})
	if !ok {
		return fmt.Errorf("invalid Apprise URLs configuration")
	}

	var errors []string
	successCount := 0

	for i, url := range urls {
		urlStr, ok := url.(string)
		if !ok {
			errors = append(errors, fmt.Sprintf("URL at index %d must be a string", i))
			continue
		}

		// Send notification to this URL
		if err := sendAppriseNotification(ctx, urlStr, msg); err != nil {
			errors = append(errors, fmt.Sprintf("URL at index %d (%s): %v", i, urlStr, err))
		} else {
			successCount++
		}
	}

	if successCount == 0 {
		return fmt.Errorf("failed to send notifications: %s", strings.Join(errors, "; "))
	}

	if len(errors) > 0 {
		slog.WarnContext(ctx, "Some Apprise notifications failed",
			slog.Int("successCount", successCount),
			slog.Int("errorCount", len(errors)),
			slog.String("errors", strings.Join(errors, "; ")))
	}

	return nil
}

// sendAppriseNotification sends a notification to a specific Apprise URL
func sendAppriseNotification(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	// Parse the URL to determine the provider type
	if strings.HasPrefix(urlStr, "tgram://") || strings.HasPrefix(urlStr, "telegram://") {
		return sendTelegramNotification(ctx, urlStr, msg)
	} else if strings.HasPrefix(urlStr, "discord://") {
		return sendDiscordNotification(ctx, urlStr, msg)
	} else if strings.HasPrefix(urlStr, "slack://") {
		return sendSlackNotification(ctx, urlStr, msg)
	} else if strings.HasPrefix(urlStr, "mailto://") || strings.HasPrefix(urlStr, "smtp://") {
		return sendEmailNotification(ctx, urlStr, msg)
	} else if strings.HasPrefix(urlStr, "json://") || strings.HasPrefix(urlStr, "xml://") {
		return sendGenericWebhook(ctx, urlStr, msg)
	} else if strings.HasPrefix(urlStr, "webhook://") {
		return sendWebhookNotification(ctx, urlStr, msg)
	} else if strings.HasPrefix(urlStr, "http://") || strings.HasPrefix(urlStr, "https://") {
		return sendGenericWebhook(ctx, urlStr, msg)
	} else {
		return fmt.Errorf("unsupported Apprise URL format: %s", urlStr)
	}
}

// sendTelegramNotification sends a notification via Telegram
func sendTelegramNotification(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	// Parse tgram://{bot_token}/{chat_id} format
	parts := strings.Split(strings.TrimPrefix(urlStr, "tgram://"), "/")
	if len(parts) < 2 {
		// Try telegram:// format
		parts = strings.Split(strings.TrimPrefix(urlStr, "telegram://"), "/")
		if len(parts) < 2 {
			return fmt.Errorf("invalid Telegram URL format: expected tgram://{token}/{chat_id}")
		}
	}

	botToken := parts[0]
	chatID := parts[1]

	// Send message to Telegram Bot API
	telegramAPI := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       fmt.Sprintf("*%s*\n\n%s", msg.Title, msg.Body),
		"parse_mode": "Markdown",
	}

	if msg.Priority == "high" {
		payload["disable_notification"] = false
	}

	return sendHTTPRequest(ctx, telegramAPI, "POST", payload, map[string]string{
		"Content-Type": "application/json",
	})
}

// sendDiscordNotification sends a notification via Discord
func sendDiscordNotification(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	// Parse discord://{webhook_id}/{webhook_token} format
	parts := strings.Split(strings.TrimPrefix(urlStr, "discord://"), "/")
	if len(parts) < 2 {
		return fmt.Errorf("invalid Discord URL format: expected discord://{webhook_id}/{webhook_token}")
	}

	webhookID := parts[0]
	webhookToken := parts[1]

	discordAPI := fmt.Sprintf("https://discord.com/api/webhooks/%s/%s", webhookID, webhookToken)

	// Determine embed color based on priority
	color := 3447003 // Blue (default)
	switch msg.Priority {
	case "high":
		color = 15158332 // Red
	case "low":
		color = 3066993 // Green
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{
			{
				"title":       msg.Title,
				"description": msg.Body,
				"color":       color,
				"timestamp":   time.Now().Format(time.RFC3339),
			},
		},
	}

	return sendHTTPRequest(ctx, discordAPI, "POST", payload, map[string]string{
		"Content-Type": "application/json",
	})
}

// sendSlackNotification sends a notification via Slack
func sendSlackNotification(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	// Parse slack://{token}/{channel} format
	parts := strings.Split(strings.TrimPrefix(urlStr, "slack://"), "/")
	if len(parts) < 2 {
		return fmt.Errorf("invalid Slack URL format: expected slack://{token}/{channel}")
	}

	botToken := parts[0]
	channel := parts[1]

	slackAPI := "https://slack.com/api/chat.postMessage"

	payload := map[string]interface{}{
		"channel":  channel,
		"text":     fmt.Sprintf("*%s*\n\n%s", msg.Title, msg.Body),
		"username": "Arcane",
	}

	return sendHTTPRequest(ctx, slackAPI, "POST", payload, map[string]string{
		"Content-Type":  "application/json",
		"Authorization": fmt.Sprintf("Bearer %s", botToken),
	})
}

// sendEmailNotification sends a notification via email
func sendEmailNotification(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	// For now, just log since SMTP setup is complex
	// In a full implementation, this would parse mailto:// or smtp:// URLs and send emails
	slog.InfoContext(ctx, "Email notification would be sent",
		slog.String("url", urlStr),
		slog.String("title", msg.Title))

	return nil
}

// sendGenericWebhook sends a notification to a generic webhook
func sendGenericWebhook(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	webhookURL := strings.TrimPrefix(strings.TrimPrefix(urlStr, "json://"), "xml://")

	var payload interface{}
	contentType := "application/json"

	if strings.HasPrefix(urlStr, "xml://") {
		// Create XML payload
		payload = map[string]string{
			"title": msg.Title,
			"body":  msg.Body,
		}
		contentType = "application/xml"
	} else {
		// Create JSON payload
		payload = map[string]interface{}{
			"title":     msg.Title,
			"body":      msg.Body,
			"format":    msg.Format,
			"priority":  msg.Priority,
			"tags":      msg.Tags,
			"metadata":  msg.Metadata,
			"timestamp": time.Now().Format(time.RFC3339),
		}
	}

	return sendHTTPRequest(ctx, webhookURL, "POST", payload, map[string]string{
		"Content-Type": contentType,
	})
}

// sendWebhookNotification sends a notification to a webhook
func sendWebhookNotification(ctx context.Context, urlStr string, msg *models.NotificationMessage) error {
	webhookURL := strings.TrimPrefix(urlStr, "webhook://")

	payload := map[string]interface{}{
		"title":     msg.Title,
		"body":      msg.Body,
		"format":    msg.Format,
		"priority":  msg.Priority,
		"tags":      msg.Tags,
		"metadata":  msg.Metadata,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	return sendHTTPRequest(ctx, webhookURL, "POST", payload, map[string]string{
		"Content-Type": "application/json",
	})
}

// sendHTTPRequest sends an HTTP request with JSON payload
func sendHTTPRequest(ctx context.Context, url, method string, payload interface{}, headers map[string]string) error {
	var body []byte
	var err error

	if payload != nil {
		body, err = json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal payload: %w", err)
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (p *AppriseProvider) GetConfigSchema() map[string]models.ParamDef {
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

// Helper function to validate Apprise URLs
func validateAppriseURL(url string) error {
	if url == "" {
		return fmt.Errorf("URL cannot be empty")
	}

	// Basic URL validation
	if !strings.Contains(url, "://") {
		return fmt.Errorf("URL must contain protocol (e.g., tgram://, discord://, etc.)")
	}

	// Check for valid protocol
	protocol := strings.Split(url, "://")[0]
	validProtocols := []string{
		"discord", "slack", "telegram", "tgram", "teams", "mattermost",
		"rocketchat", "zulip", "matrix", "email", "mailto", "smtp",
		"pushover", "pushbullet", "prowl", "webhook", "json", "xml",
		"http", "https", "syslog", "twitter", "twilio",
	}

	isValid := false
	for _, valid := range validProtocols {
		if strings.HasPrefix(protocol, valid) {
			isValid = true
			break
		}
	}

	if !isValid {
		return fmt.Errorf("unsupported protocol: %s", protocol)
	}

	return nil
}

// Placeholder implementations for other providers
type WhatsAppProvider struct{ BaseProvider }
type SignalProvider struct{ BaseProvider }
type PushbulletProvider struct{ BaseProvider }
type PushoverProvider struct{ BaseProvider }
type ProwlProvider struct{ BaseProvider }
type DesktopProvider struct{ BaseProvider }
type XMLProvider struct{ BaseProvider }
type RSSProvider struct{ BaseProvider }
type MatrixProvider struct{ BaseProvider }
type RocketProvider struct{ BaseProvider }
type MattermostProvider struct{ BaseProvider }
type ZulipProvider struct{ BaseProvider }
type GmailProvider struct{ BaseProvider }
type OutlookProvider struct{ BaseProvider }
type SendGridProvider struct{ BaseProvider }
type MailgunProvider struct{ BaseProvider }
type S3Provider struct{ BaseProvider }
type DropboxProvider struct{ BaseProvider }
type DriveProvider struct{ BaseProvider }
type OneDriveProvider struct{ BaseProvider }

func NewWhatsAppProvider() *WhatsAppProvider {
	return &WhatsAppProvider{BaseProvider: BaseProvider{name: models.NotificationProviderWhatsApp, category: models.ProviderCategoryChat}}
}
func NewSignalProvider() *SignalProvider {
	return &SignalProvider{BaseProvider: BaseProvider{name: models.NotificationProviderSignal, category: models.ProviderCategoryChat}}
}
func NewPushbulletProvider() *PushbulletProvider {
	return &PushbulletProvider{BaseProvider: BaseProvider{name: models.NotificationProviderPushbullet, category: models.ProviderCategoryMobile}}
}
func NewPushoverProvider() *PushoverProvider {
	return &PushoverProvider{BaseProvider: BaseProvider{name: models.NotificationProviderPushover, category: models.ProviderCategoryMobile}}
}
func NewProwlProvider() *ProwlProvider {
	return &ProwlProvider{BaseProvider: BaseProvider{name: models.NotificationProviderProwl, category: models.ProviderCategoryMobile}}
}
func NewDesktopProvider() *DesktopProvider {
	return &DesktopProvider{BaseProvider: BaseProvider{name: models.NotificationProviderDesktop, category: models.ProviderCategoryDesktop}}
}
func NewXMLProvider() *XMLProvider {
	return &XMLProvider{BaseProvider: BaseProvider{name: models.NotificationProviderXML, category: models.ProviderCategoryWeb}}
}
func NewRSSProvider() *RSSProvider {
	return &RSSProvider{BaseProvider: BaseProvider{name: models.NotificationProviderRSS, category: models.ProviderCategoryFeed}}
}
func NewMatrixProvider() *MatrixProvider {
	return &MatrixProvider{BaseProvider: BaseProvider{name: models.NotificationProviderMatrix, category: models.ProviderCategoryChat}}
}
func NewRocketProvider() *RocketProvider {
	return &RocketProvider{BaseProvider: BaseProvider{name: models.NotificationProviderRocket, category: models.ProviderCategoryChat}}
}
func NewMattermostProvider() *MattermostProvider {
	return &MattermostProvider{BaseProvider: BaseProvider{name: models.NotificationProviderMattermost, category: models.ProviderCategoryChat}}
}
func NewZulipProvider() *ZulipProvider {
	return &ZulipProvider{BaseProvider: BaseProvider{name: models.NotificationProviderZulip, category: models.ProviderCategoryChat}}
}
func NewGmailProvider() *GmailProvider {
	return &GmailProvider{BaseProvider: BaseProvider{name: models.NotificationProviderGmail, category: models.ProviderCategoryEmail}}
}
func NewOutlookProvider() *OutlookProvider {
	return &OutlookProvider{BaseProvider: BaseProvider{name: models.NotificationProviderOutlook, category: models.ProviderCategoryEmail}}
}
func NewSendGridProvider() *SendGridProvider {
	return &SendGridProvider{BaseProvider: BaseProvider{name: models.NotificationProviderSendGrid, category: models.ProviderCategoryEmail}}
}
func NewMailgunProvider() *MailgunProvider {
	return &MailgunProvider{BaseProvider: BaseProvider{name: models.NotificationProviderMailgun, category: models.ProviderCategoryEmail}}
}
func NewS3Provider() *S3Provider {
	return &S3Provider{BaseProvider: BaseProvider{name: models.NotificationProviderS3, category: models.ProviderCategoryCloud}}
}
func NewDropboxProvider() *DropboxProvider {
	return &DropboxProvider{BaseProvider: BaseProvider{name: models.NotificationProviderDropbox, category: models.ProviderCategoryCloud}}
}
func NewDriveProvider() *DriveProvider {
	return &DriveProvider{BaseProvider: BaseProvider{name: models.NotificationProviderDrive, category: models.ProviderCategoryCloud}}
}
func NewOneDriveProvider() *OneDriveProvider {
	return &OneDriveProvider{BaseProvider: BaseProvider{name: models.NotificationProviderOneDrive, category: models.ProviderCategoryCloud}}
}

// Implement minimal interfaces for all providers
func (p *WhatsAppProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *SignalProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *PushbulletProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *PushoverProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *ProwlProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *DesktopProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *XMLProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *RSSProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *MatrixProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *RocketProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *MattermostProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *ZulipProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *GmailProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *OutlookProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *SendGridProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *MailgunProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *S3Provider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *DropboxProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *DriveProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}
func (p *OneDriveProvider) ValidateConfig(config models.JSON) (*models.ProviderValidationResult, error) {
	return &models.ProviderValidationResult{Provider: p.Name(), Valid: false, Errors: []string{"Not implemented"}}, nil
}

func (p *WhatsAppProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *SignalProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *PushbulletProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *PushoverProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *ProwlProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *DesktopProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *XMLProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *RSSProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *MatrixProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *RocketProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *MattermostProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *ZulipProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *GmailProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *OutlookProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *SendGridProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *MailgunProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *S3Provider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *DropboxProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *DriveProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}
func (p *OneDriveProvider) SendMessage(ctx context.Context, msg *models.NotificationMessage, config models.JSON) error {
	return fmt.Errorf("not implemented")
}

func (p *WhatsAppProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *SignalProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *PushbulletProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *PushoverProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *ProwlProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *DesktopProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *XMLProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *RSSProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *MatrixProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *RocketProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *MattermostProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *ZulipProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *GmailProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *OutlookProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *SendGridProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *MailgunProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *S3Provider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *DropboxProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *DriveProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}
func (p *OneDriveProvider) GetConfigSchema() map[string]models.ParamDef {
	return map[string]models.ParamDef{}
}

// Helper functions for URL validation
func validateSlackWebhookURL(webhookURL string) error {
	parsedURL, err := url.Parse(webhookURL)
	if err != nil {
		return err
	}

	if !strings.Contains(parsedURL.Host, "slack.com") && !strings.Contains(parsedURL.Host, "slack-edge.com") {
		return fmt.Errorf("must be a Slack webhook URL")
	}

	return nil
}

func validateTeamsWebhookURL(webhookURL string) error {
	parsedURL, err := url.Parse(webhookURL)
	if err != nil {
		return err
	}

	if !strings.Contains(parsedURL.Host, "office.com") && !strings.Contains(parsedURL.Host, "microsoft.com") {
		return fmt.Errorf("must be a Teams webhook URL")
	}

	return nil
}

func validateGenericWebhookURL(webhookURL string) error {
	parsedURL, err := url.Parse(webhookURL)
	if err != nil {
		return err
	}

	if parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("invalid URL format")
	}

	return nil
}

// Helper function to send webhook requests
func sendWebhook(ctx context.Context, url, method string, payload []byte, contentType string, headers map[string]string) error {
	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewBuffer(payload))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", contentType)

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
