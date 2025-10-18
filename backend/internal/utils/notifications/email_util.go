package notifications

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/emersion/go-sasl"
	"github.com/emersion/go-smtp"
	"github.com/ofkm/arcane-backend/internal/models"
)

// EmailClient wraps the SMTP client functionality
type EmailClient struct {
	client *smtp.Client
}

// ConnectSMTP establishes a connection to the SMTP server based on the TLS mode
func ConnectSMTP(ctx context.Context, config models.EmailConfig) (*EmailClient, error) {
	// Check if context is still valid
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	addr := fmt.Sprintf("%s:%d", config.SMTPHost, config.SMTPPort)

	tlsConfig := &tls.Config{
		ServerName:         config.SMTPHost,
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: false,
	}

	var client *smtp.Client
	var err error

	// Default to StartTLS if not set
	tlsMode := config.TLSMode
	if tlsMode == "" {
		tlsMode = models.EmailTLSModeStartTLS
	}

	// Connect based on TLS mode
	switch tlsMode {
	case models.EmailTLSModeNone:
		client, err = smtp.Dial(addr)
	case models.EmailTLSModeSSL:
		client, err = smtp.DialTLS(addr, tlsConfig)
	case models.EmailTLSModeStartTLS:
		client, err = smtp.DialStartTLS(addr, tlsConfig)
	default:
		return nil, fmt.Errorf("unknown TLS mode: %s", tlsMode)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to SMTP server: %w", err)
	}

	client.CommandTimeout = 10 * time.Second

	// Send HELLO command
	if err := sendHelloCommand(client); err != nil {
		client.Close()
		return nil, fmt.Errorf("failed to send HELLO command: %w", err)
	}

	// Authenticate if credentials are provided
	if config.SMTPUsername != "" || config.SMTPPassword != "" {
		if err := authenticateSMTP(client, config.SMTPUsername, config.SMTPPassword); err != nil {
			client.Close()
			return nil, fmt.Errorf("failed to authenticate: %w", err)
		}
	}

	return &EmailClient{client: client}, nil
}

// sendHelloCommand sends the HELO/EHLO command to the SMTP server
func sendHelloCommand(client *smtp.Client) error {
	// Try to get hostname, use "localhost" as fallback
	hostname := "localhost"
	return client.Hello(hostname)
}

// authenticateSMTP authenticates with the SMTP server using PLAIN or LOGIN mechanisms
func authenticateSMTP(client *smtp.Client, username, password string) error {
	// Try PLAIN authentication first
	auth := sasl.NewPlainClient("", username, password)
	err := client.Auth(auth)

	if err != nil {
		// If PLAIN fails with unknown mechanism, try LOGIN
		var smtpErr *smtp.SMTPError
		if errors.As(err, &smtpErr) && smtpErr.Code == smtp.ErrAuthUnknownMechanism.Code {
			auth = sasl.NewLoginClient(username, password)
			err = client.Auth(auth)
		}
	}

	return err
}

// SendMessage sends an email message through the SMTP client
func (ec *EmailClient) SendMessage(fromAddress string, toAddresses []string, message string) error {
	// Set the sender
	if err := ec.client.Mail(fromAddress, nil); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipients
	for _, to := range toAddresses {
		if err := ec.client.Rcpt(to, nil); err != nil {
			return fmt.Errorf("failed to set recipient %s: %w", to, err)
		}
	}

	// Get a writer to write the email data
	w, err := ec.client.Data()
	if err != nil {
		return fmt.Errorf("failed to start data: %w", err)
	}

	// Write the email content
	_, err = io.Copy(w, strings.NewReader(message))
	if err != nil {
		return fmt.Errorf("failed to write email data: %w", err)
	}

	// Close the writer
	if err := w.Close(); err != nil {
		return fmt.Errorf("failed to close data writer: %w", err)
	}

	return nil
}

// Close closes the SMTP connection
func (ec *EmailClient) Close() error {
	if ec.client != nil {
		return ec.client.Close()
	}
	return nil
}

// SanitizeForEmail restricts to safe characters for email (alphanumerics, dash, dot, slash, colon, at, underscore).
// It removes any character not matching the safe set and explicitly strips CRLF characters to prevent header injection.
func SanitizeForEmail(s string) string {
	// First, strip out all carriage returns and newlines to prevent email header/content injection
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "")

	// Allow only: letters, numbers, dot, slash, dash, colon, at, underscore
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

// BuildSimpleMessage constructs a simple email message with headers
func BuildSimpleMessage(fromAddress string, toAddresses []string, subject string, body string) string {
	var buf bytes.Buffer

	// Add headers
	buf.WriteString(fmt.Sprintf("From: %s\r\n", fromAddress))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(toAddresses, ", ")))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString(fmt.Sprintf("Date: %s\r\n", time.Now().Format(time.RFC1123Z)))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	buf.WriteString("\r\n")

	// Add body
	buf.WriteString(body)

	return buf.String()
}
