package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"text/template"
	"time"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/notifications"
	"github.com/ofkm/arcane-backend/resources"
)

type NotificationService struct {
	db     *database.DB
	config *config.Config
}

func NewNotificationService(db *database.DB, cfg *config.Config) *NotificationService {
	return &NotificationService{
		db:     db,
		config: cfg,
	}
}

func (s *NotificationService) GetAllSettings(ctx context.Context) ([]models.NotificationSettings, error) {
	var settings []models.NotificationSettings
	if err := s.db.WithContext(ctx).Find(&settings).Error; err != nil {
		return nil, fmt.Errorf("failed to get notification settings: %w", err)
	}
	return settings, nil
}

func (s *NotificationService) GetSettingsByProvider(ctx context.Context, provider string) (*models.NotificationSettings, error) {
	var setting models.NotificationSettings
	if err := s.db.WithContext(ctx).Where("provider = ?", provider).First(&setting).Error; err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *NotificationService) CreateOrUpdateSettings(ctx context.Context, provider string, enabled bool, config models.JSON) (*models.NotificationSettings, error) {
	var setting models.NotificationSettings

	err := s.db.WithContext(ctx).Where("provider = ?", provider).First(&setting).Error
	if err != nil {
		setting = models.NotificationSettings{
			Provider: provider,
			Enabled:  enabled,
			Config:   config,
		}
		if err := s.db.WithContext(ctx).Create(&setting).Error; err != nil {
			return nil, fmt.Errorf("failed to create notification settings: %w", err)
		}
	} else {
		setting.Enabled = enabled
		setting.Config = config
		if err := s.db.WithContext(ctx).Save(&setting).Error; err != nil {
			return nil, fmt.Errorf("failed to update notification settings: %w", err)
		}
	}

	return &setting, nil
}

func (s *NotificationService) DeleteSettings(ctx context.Context, provider string) error {
	if err := s.db.WithContext(ctx).Where("provider = ?", provider).Delete(&models.NotificationSettings{}).Error; err != nil {
		return fmt.Errorf("failed to delete notification settings: %w", err)
	}
	return nil
}

func (s *NotificationService) SendImageUpdateNotification(ctx context.Context, imageRef string, updateInfo *dto.ImageUpdateResponse, eventType models.NotificationEventType) error {
	settings, err := s.GetAllSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get notification settings: %w", err)
	}

	var errors []string
	for _, setting := range settings {
		if !setting.Enabled {
			continue
		}

		// Check if this event type is enabled for this provider
		if !s.isEventEnabled(setting.Config, eventType) {
			continue
		}

		var sendErr error
		switch setting.Provider {
		case string(models.NotificationProviderDiscord):
			sendErr = s.sendDiscordNotification(ctx, imageRef, updateInfo, setting.Config)
		case string(models.NotificationProviderEmail):
			sendErr = s.sendEmailNotification(ctx, imageRef, updateInfo, setting.Config)
		default:
			slog.WarnContext(ctx, "Unknown notification provider", "provider", setting.Provider)
			continue
		}

		status := "success"
		var errMsg *string
		if sendErr != nil {
			status = "failed"
			msg := sendErr.Error()
			errMsg = &msg
			errors = append(errors, fmt.Sprintf("%s: %s", setting.Provider, msg))
		}

		s.logNotification(ctx, setting.Provider, imageRef, status, errMsg, models.JSON{
			"hasUpdate":     updateInfo.HasUpdate,
			"currentDigest": updateInfo.CurrentDigest,
			"latestDigest":  updateInfo.LatestDigest,
			"updateType":    updateInfo.UpdateType,
			"eventType":     string(eventType),
		})
	}

	if len(errors) > 0 {
		return fmt.Errorf("notification errors: %s", strings.Join(errors, "; "))
	}

	return nil
}

// isEventEnabled checks if a specific event type is enabled in the config
func (s *NotificationService) isEventEnabled(config models.JSON, eventType models.NotificationEventType) bool {
	configBytes, err := json.Marshal(config)
	if err != nil {
		return true // Default to enabled if we can't parse
	}

	var configMap map[string]interface{}
	if err := json.Unmarshal(configBytes, &configMap); err != nil {
		return true // Default to enabled if we can't parse
	}

	events, ok := configMap["events"].(map[string]interface{})
	if !ok {
		return true // If no events config, default to enabled
	}

	enabled, ok := events[string(eventType)].(bool)
	if !ok {
		return true // If event type not specified, default to enabled
	}

	return enabled
}

func (s *NotificationService) sendDiscordNotification(ctx context.Context, imageRef string, updateInfo *dto.ImageUpdateResponse, config models.JSON) error {
	var discordConfig models.DiscordConfig
	configBytes, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal Discord config: %w", err)
	}
	if err := json.Unmarshal(configBytes, &discordConfig); err != nil {
		return fmt.Errorf("failed to unmarshal Discord config: %w", err)
	}

	if discordConfig.WebhookURL == "" {
		return fmt.Errorf("discord webhook URL not configured")
	}

	// Decrypt webhook URL if encrypted
	webhookURL := discordConfig.WebhookURL
	if decrypted, err := utils.Decrypt(webhookURL); err == nil {
		webhookURL = decrypted
	}

	// Validate webhook URL to prevent SSRF
	if err := validateWebhookURL(webhookURL); err != nil {
		return fmt.Errorf("invalid webhook URL: %w", err)
	}

	username := discordConfig.Username
	if username == "" {
		username = "Arcane"
	}

	color := 3447003 // Blue
	if updateInfo.HasUpdate {
		color = 15844367 // Gold for updates
	}

	fields := []map[string]interface{}{
		{
			"name":   "Image",
			"value":  imageRef,
			"inline": false,
		},
		{
			"name":   "Update Available",
			"value":  fmt.Sprintf("%t", updateInfo.HasUpdate),
			"inline": true,
		},
		{
			"name":   "Update Type",
			"value":  updateInfo.UpdateType,
			"inline": true,
		},
	}

	if updateInfo.CurrentDigest != "" {
		fields = append(fields, map[string]interface{}{
			"name":   "Current Digest",
			"value":  truncateDigest(updateInfo.CurrentDigest),
			"inline": true,
		})
	}
	if updateInfo.LatestDigest != "" {
		fields = append(fields, map[string]interface{}{
			"name":   "Latest Digest",
			"value":  truncateDigest(updateInfo.LatestDigest),
			"inline": true,
		})
	}

	payload := map[string]interface{}{
		"username": username,
		"embeds": []map[string]interface{}{
			{
				"title":       "🔔 Container Image Update Available",
				"description": fmt.Sprintf("A new update has been detected for **%s**", imageRef),
				"color":       color,
				"fields":      fields,
				"timestamp":   time.Now().Format(time.RFC3339),
			},
		},
	}

	if discordConfig.AvatarURL != "" {
		payload["avatar_url"] = discordConfig.AvatarURL
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal Discord payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create Discord request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send Discord notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("discord webhook returned status %d", resp.StatusCode)
	}

	return nil
}

func (s *NotificationService) sendEmailNotification(ctx context.Context, imageRef string, updateInfo *dto.ImageUpdateResponse, config models.JSON) error {
	var emailConfig models.EmailConfig
	configBytes, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal email config: %w", err)
	}
	if err := json.Unmarshal(configBytes, &emailConfig); err != nil {
		return fmt.Errorf("failed to unmarshal email config: %w", err)
	}

	if emailConfig.SMTPHost == "" || emailConfig.SMTPPort == 0 {
		return fmt.Errorf("SMTP host or port not configured")
	}
	if len(emailConfig.ToAddresses) == 0 {
		return fmt.Errorf("no recipient email addresses configured")
	}

	if _, err := mail.ParseAddress(emailConfig.FromAddress); err != nil {
		return fmt.Errorf("invalid from address: %w", err)
	}
	for _, addr := range emailConfig.ToAddresses {
		if _, err := mail.ParseAddress(addr); err != nil {
			return fmt.Errorf("invalid to address %s: %w", addr, err)
		}
	}

	if emailConfig.SMTPPassword != "" {
		if decrypted, err := utils.Decrypt(emailConfig.SMTPPassword); err == nil {
			emailConfig.SMTPPassword = decrypted
		}
	}

	htmlBody, textBody, err := s.renderEmailTemplate(imageRef, updateInfo)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	subject := fmt.Sprintf("Container Update Available: %s", notifications.SanitizeForEmail(imageRef))
	message := notifications.BuildMultipartMessage(emailConfig.FromAddress, emailConfig.ToAddresses, subject, htmlBody, textBody)

	client, err := notifications.ConnectSMTP(ctx, emailConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	if err := client.SendMessage(emailConfig.FromAddress, emailConfig.ToAddresses, message); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

func (s *NotificationService) renderEmailTemplate(imageRef string, updateInfo *dto.ImageUpdateResponse) (string, string, error) {
	data := map[string]interface{}{
		"LogoURL":       "https://raw.githubusercontent.com/ofkm/arcane/main/backend/resources/images/logo-full.svg",
		"AppURL":        s.config.AppUrl,
		"ImageRef":      imageRef,
		"HasUpdate":     updateInfo.HasUpdate,
		"UpdateType":    updateInfo.UpdateType,
		"CurrentDigest": truncateDigest(updateInfo.CurrentDigest),
		"LatestDigest":  truncateDigest(updateInfo.LatestDigest),
		"CheckTime":     updateInfo.CheckTime.Format(time.RFC1123),
	}

	htmlContent, err := resources.FS.ReadFile("email-templates/image-update_html.tmpl")
	if err != nil {
		return "", "", fmt.Errorf("failed to read HTML template: %w", err)
	}

	htmlTmpl, err := template.New("html").Parse(string(htmlContent))
	if err != nil {
		return "", "", fmt.Errorf("failed to parse HTML template: %w", err)
	}

	var htmlBuf bytes.Buffer
	if err := htmlTmpl.ExecuteTemplate(&htmlBuf, "root", data); err != nil {
		return "", "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	textContent, err := resources.FS.ReadFile("email-templates/image-update_text.tmpl")
	if err != nil {
		return "", "", fmt.Errorf("failed to read text template: %w", err)
	}

	textTmpl, err := template.New("text").Parse(string(textContent))
	if err != nil {
		return "", "", fmt.Errorf("failed to parse text template: %w", err)
	}

	var textBuf bytes.Buffer
	if err := textTmpl.ExecuteTemplate(&textBuf, "root", data); err != nil {
		return "", "", fmt.Errorf("failed to execute text template: %w", err)
	}

	return htmlBuf.String(), textBuf.String(), nil
}

func (s *NotificationService) TestNotification(ctx context.Context, provider string, testType string) error {
	setting, err := s.GetSettingsByProvider(ctx, provider)
	if err != nil {
		return fmt.Errorf("failed to get settings for provider %s: %w", provider, err)
	}

	testUpdate := &dto.ImageUpdateResponse{
		HasUpdate:      true,
		UpdateType:     "digest",
		CurrentDigest:  "sha256:abc123def456789012345678901234567890",
		LatestDigest:   "sha256:xyz789ghi012345678901234567890123456",
		CheckTime:      time.Now(),
		ResponseTimeMs: 100,
	}

	switch provider {
	case string(models.NotificationProviderDiscord):
		return s.sendDiscordNotification(ctx, "test/image:latest", testUpdate, setting.Config)
	case string(models.NotificationProviderEmail):
		if testType == "image-update" {
			return s.sendEmailNotification(ctx, "nginx:latest", testUpdate, setting.Config)
		}
		return s.sendTestEmail(ctx, setting.Config)
	default:
		return fmt.Errorf("unknown provider: %s", provider)
	}
}

func (s *NotificationService) sendTestEmail(ctx context.Context, config models.JSON) error {
	var emailConfig models.EmailConfig
	configBytes, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal email config: %w", err)
	}
	if err := json.Unmarshal(configBytes, &emailConfig); err != nil {
		return fmt.Errorf("failed to unmarshal email config: %w", err)
	}

	if emailConfig.SMTPHost == "" || emailConfig.SMTPPort == 0 {
		return fmt.Errorf("SMTP host or port not configured")
	}
	if len(emailConfig.ToAddresses) == 0 {
		return fmt.Errorf("no recipient email addresses configured")
	}

	if _, err := mail.ParseAddress(emailConfig.FromAddress); err != nil {
		return fmt.Errorf("invalid from address: %w", err)
	}
	for _, addr := range emailConfig.ToAddresses {
		if _, err := mail.ParseAddress(addr); err != nil {
			return fmt.Errorf("invalid to address %s: %w", addr, err)
		}
	}

	if emailConfig.SMTPPassword != "" {
		if decrypted, err := utils.Decrypt(emailConfig.SMTPPassword); err == nil {
			emailConfig.SMTPPassword = decrypted
		}
	}

	htmlBody, textBody, err := s.renderTestEmailTemplate()
	if err != nil {
		return fmt.Errorf("failed to render test email template: %w", err)
	}

	subject := "Test Email from Arcane"
	message := notifications.BuildMultipartMessage(emailConfig.FromAddress, emailConfig.ToAddresses, subject, htmlBody, textBody)

	client, err := notifications.ConnectSMTP(ctx, emailConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	if err := client.SendMessage(emailConfig.FromAddress, emailConfig.ToAddresses, message); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

func (s *NotificationService) renderTestEmailTemplate() (string, string, error) {
	data := map[string]interface{}{
		"LogoURL": "https://raw.githubusercontent.com/ofkm/arcane/main/backend/resources/images/logo-full.svg",
		"AppURL":  s.config.AppUrl,
	}

	htmlContent, err := resources.FS.ReadFile("email-templates/test_html.tmpl")
	if err != nil {
		return "", "", fmt.Errorf("failed to read HTML template: %w", err)
	}

	htmlTmpl, err := template.New("html").Parse(string(htmlContent))
	if err != nil {
		return "", "", fmt.Errorf("failed to parse HTML template: %w", err)
	}

	var htmlBuf bytes.Buffer
	if err := htmlTmpl.ExecuteTemplate(&htmlBuf, "root", data); err != nil {
		return "", "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	textContent, err := resources.FS.ReadFile("email-templates/test_text.tmpl")
	if err != nil {
		return "", "", fmt.Errorf("failed to read text template: %w", err)
	}

	textTmpl, err := template.New("text").Parse(string(textContent))
	if err != nil {
		return "", "", fmt.Errorf("failed to parse text template: %w", err)
	}

	var textBuf bytes.Buffer
	if err := textTmpl.ExecuteTemplate(&textBuf, "root", data); err != nil {
		return "", "", fmt.Errorf("failed to execute text template: %w", err)
	}

	return htmlBuf.String(), textBuf.String(), nil
}

func (s *NotificationService) logNotification(ctx context.Context, provider, imageRef, status string, errMsg *string, metadata models.JSON) {
	log := &models.NotificationLog{
		Provider: provider,
		ImageRef: imageRef,
		Status:   status,
		Error:    errMsg,
		Metadata: metadata,
		SentAt:   time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(log).Error; err != nil {
		slog.WarnContext(ctx, "Failed to log notification",
			slog.String("provider", provider),
			slog.String("error", err.Error()))
	}
}

func truncateDigest(digest string) string {
	if len(digest) > 19 {
		return digest[:19] + "..."
	}
	return digest
}

// validateWebhookURL validates that the webhook URL is a valid Discord webhook URL
// This prevents SSRF attacks by ensuring the URL points to Discord's API
func validateWebhookURL(webhookURL string) error {
	parsedURL, err := url.Parse(webhookURL)
	if err != nil {
		return fmt.Errorf("failed to parse webhook URL: %w", err)
	}

	// Ensure it's HTTPS
	if parsedURL.Scheme != "https" {
		return fmt.Errorf("webhook URL must use HTTPS")
	}

	// Validate it's a Discord webhook URL
	validHosts := []string{
		"discord.com",
		"discordapp.com",
	}

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

	// Validate it's a webhook path
	if !strings.HasPrefix(parsedURL.Path, "/api/webhooks/") {
		return fmt.Errorf("invalid Discord webhook path")
	}

	return nil
}
