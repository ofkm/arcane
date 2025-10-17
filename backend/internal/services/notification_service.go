package services

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/url"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

// sanitizeForEmail restricts to safe characters for email (alphanumerics, dash, dot, slash, colon, at, underscore).
// It removes any character not matching the safe set and prevents header injection.
func sanitizeForEmail(s string) string {
	// Allow: letters, numbers, dot, slash, dash, colon, at, underscore
	safe := make([]rune, 0, len(s))
	for _, c := range s {
		if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
			(c >= '0' && c <= '9') ||
			c == '.' || c == '/' || c == '-' || c == ':' ||
			c == '@' || c == '_' {
			safe = append(safe, c)
		}
	}
	return string(safe)
}

type NotificationService struct {
	db *database.DB
}

func NewNotificationService(db *database.DB) *NotificationService {
	return &NotificationService{
		db: db,
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

func (s *NotificationService) SendImageUpdateNotification(ctx context.Context, imageRef string, updateInfo *dto.ImageUpdateResponse) error {
	settings, err := s.GetAllSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get notification settings: %w", err)
	}

	var errors []string
	for _, setting := range settings {
		if !setting.Enabled {
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
		})
	}

	if len(errors) > 0 {
		return fmt.Errorf("notification errors: %s", strings.Join(errors, "; "))
	}

	return nil
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

	// Validate email addresses
	if _, err := mail.ParseAddress(emailConfig.FromAddress); err != nil {
		return fmt.Errorf("invalid from address: %w", err)
	}
	for _, addr := range emailConfig.ToAddresses {
		if _, err := mail.ParseAddress(addr); err != nil {
			return fmt.Errorf("invalid to address %s: %w", addr, err)
		}
	}

	// Decrypt SMTP password if encrypted
	password := emailConfig.SMTPPassword
	if decrypted, err := utils.Decrypt(password); err == nil {
		password = decrypted
	}

	message := s.buildEmailMessage(emailConfig, imageRef, updateInfo)
	auth := smtp.PlainAuth("", emailConfig.SMTPUsername, password, emailConfig.SMTPHost)
	addr := fmt.Sprintf("%s:%d", emailConfig.SMTPHost, emailConfig.SMTPPort)

	if emailConfig.UseTLS {
		return s.sendEmailWithTLS(ctx, addr, auth, emailConfig, message)
	}
	return s.sendEmailPlain(addr, auth, emailConfig, message)
}

func (s *NotificationService) buildEmailMessage(emailConfig models.EmailConfig, imageRef string, updateInfo *dto.ImageUpdateResponse) string {
	safeImageRef := sanitizeForEmail(imageRef)
	subject := fmt.Sprintf("Container Update Available: %s", safeImageRef)
	body := fmt.Sprintf(`Container Image Update Notification

Image: %s
Update Available: %t
Update Type: %s
Current Digest: %s
Latest Digest: %s

Checked at: %s
`,
		safeImageRef,
		updateInfo.HasUpdate,
		updateInfo.UpdateType,
		updateInfo.CurrentDigest,
		updateInfo.LatestDigest,
		updateInfo.CheckTime.Format(time.RFC3339),
	)

	return fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		emailConfig.FromAddress,
		strings.Join(emailConfig.ToAddresses, ","),
		subject,
		body,
	)
}

func (s *NotificationService) sendEmailWithTLS(ctx context.Context, addr string, auth smtp.Auth, emailConfig models.EmailConfig, message string) error {
	tlsConfig := &tls.Config{
		ServerName:         emailConfig.SMTPHost,
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: false,
	}
	dialer := &tls.Dialer{Config: tlsConfig}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to establish TLS connection: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, emailConfig.SMTPHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}
	if err := client.Mail(emailConfig.FromAddress); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}
	for _, to := range emailConfig.ToAddresses {
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("failed to set recipient %s: %w", to, err)
		}
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}
	if _, err := w.Write([]byte(message)); err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}
	return w.Close()
}

func (s *NotificationService) sendEmailPlain(addr string, auth smtp.Auth, emailConfig models.EmailConfig, message string) error {
	err := smtp.SendMail(addr, auth, emailConfig.FromAddress, emailConfig.ToAddresses, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}

func (s *NotificationService) TestNotification(ctx context.Context, provider string) error {
	setting, err := s.GetSettingsByProvider(ctx, provider)
	if err != nil {
		return fmt.Errorf("failed to get settings for provider %s: %w", provider, err)
	}

	testUpdate := &dto.ImageUpdateResponse{
		HasUpdate:      true,
		UpdateType:     "digest",
		CurrentDigest:  "sha256:abc123def456",
		LatestDigest:   "sha256:xyz789ghi012",
		CheckTime:      time.Now(),
		ResponseTimeMs: 100,
	}

	switch provider {
	case string(models.NotificationProviderDiscord):
		return s.sendDiscordNotification(ctx, "test/image:latest", testUpdate, setting.Config)
	case string(models.NotificationProviderEmail):
		return s.sendEmailNotification(ctx, "test/image:latest", testUpdate, setting.Config)
	default:
		return fmt.Errorf("unknown provider: %s", provider)
	}
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
