package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"strings"

	"github.com/ofkm/arcane-backend/internal/config"
)

var encryptionKey []byte

func InitEncryption(cfg *config.Config) {
	keyString := strings.TrimSpace(cfg.EncryptionKey)

	if keyString == "" {
		if cfg.Environment == "production" && !cfg.AgentMode {
			panic("ENCRYPTION_KEY is required in production environment")
		}

		var seed, mode string
		if cfg.AgentMode {
			slog.Warn("No ENCRYPTION_KEY provided; running in agent mode with derived key")
			seed = "arcane-agent-key"
			mode = "derived-agent"
		} else {
			slog.Warn("No ENCRYPTION_KEY provided; deriving development key")
			seed = "arcane-dev-key"
			mode = "derived-dev"
		}

		sum := sha256.Sum256([]byte(seed))
		encryptionKey = sum[:]
		if cfg.Environment != "production" || cfg.AgentMode {
			slog.Info("Encryption initialized", "env", cfg.Environment, "key_length_bytes", len(encryptionKey), "mode", mode)
		}
		return
	}

	clean := strings.TrimSpace(keyString)

	if len(clean) == 32 {
		encryptionKey = []byte(clean)
	} else {
		if b, err := base64.StdEncoding.DecodeString(clean); err == nil && len(b) == 32 {
			encryptionKey = b
		} else if b, err := base64.RawStdEncoding.DecodeString(clean); err == nil && len(b) == 32 {
			encryptionKey = b
		} else if b, err := hex.DecodeString(clean); err == nil && len(b) == 32 {
			encryptionKey = b
		} else {
			panic(fmt.Sprintf("ENCRYPTION_KEY must be 32 bytes (raw/base64/hex). Provided=%d chars", len(clean)))
		}
	}

	if cfg.Environment != "production" {
		slog.Info("Encryption initialized", "env", cfg.Environment, "key_length_bytes", len(encryptionKey))
	}
}

func Encrypt(plaintext string) (string, error) {
	if encryptionKey == nil {
		return "", fmt.Errorf("encryption not initialized - call InitEncryption first")
	}

	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func Decrypt(ciphertext string) (string, error) {
	if encryptionKey == nil {
		return "", fmt.Errorf("encryption not initialized - call InitEncryption first")
	}

	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

func IsInitialized() bool {
	return encryptionKey != nil
}
