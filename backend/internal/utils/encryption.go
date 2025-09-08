package utils

import (
	"crypto/aes"
	"crypto/cipher"
	crand "crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/ofkm/arcane-backend/internal/config"
)

var encryptionKey []byte

func InitEncryption(cfg *config.Config) {
	keyString := strings.TrimSpace(cfg.EncryptionKey)

	// If an explicit key was provided, try to accept it (raw/base64/hex)
	if keyString != "" {
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
			slog.Info("Encryption initialized from explicit ENCRYPTION_KEY", "env", cfg.Environment, "key_length_bytes", len(encryptionKey))
		}
		return
	}

	// No explicit key provided
	if cfg.AgentMode {
		// For agent mode, persist a unique per-node key to local secure storage so each agent has its own key.
		// Prefer user config dir but fall back to current working dir.
		var dir string
		if d, err := os.UserConfigDir(); err == nil && d != "" {
			dir = filepath.Join(d, "arcane")
		} else {
			wd, err := os.Getwd()
			if err != nil {
				slog.Warn("Failed to get working directory for agent key storage; using temp dir", "err", err)
				dir = os.TempDir()
			} else {
				dir = filepath.Join(wd, ".arcane")
			}
		}

		if err := os.MkdirAll(dir, 0700); err != nil {
			// If we can't create the directory, log and continue using in-memory generated key
			slog.Warn("Failed to create directory for agent encryption key; key may not persist", "dir", dir, "err", err)
		}

		keyPath := filepath.Join(dir, "agent_encryption_key")

		// Try to read existing key
		if data, err := os.ReadFile(keyPath); err == nil {
			s := strings.TrimSpace(string(data))
			if b, err := hex.DecodeString(s); err == nil && len(b) == 32 {
				encryptionKey = b
				slog.Info("Loaded agent encryption key from disk", "path", keyPath)
				return
			}
			slog.Warn("Existing agent key found but invalid; will generate a new key", "path", keyPath, "err", err)
			// fallthrough to generate new key and attempt to overwrite
		} else if !os.IsNotExist(err) {
			// if read failed for other reasons, log and continue to generate a new key (may not persist)
			slog.Warn("Failed to read agent encryption key; will generate a new key", "path", keyPath, "err", err)
		}

		// Generate a new random 32-byte key
		newKey := make([]byte, 32)
		if _, err := crand.Read(newKey); err != nil {
			// If we cannot get secure randomness, fallback to deterministic derivation as last resort
			slog.Warn("crypto/rand failed; falling back to deterministic key derivation (not ideal)", "err", err)
			sum := sha256.Sum256([]byte("arcane-agent-key"))
			encryptionKey = sum[:]
			return
		}
		encryptionKey = newKey

		// Attempt atomic write: write to temp file in same dir then rename
		tmpFile, err := os.CreateTemp(dir, "agent_key_")
		if err != nil {
			slog.Warn("Failed to create temp file to persist agent key; key will not persist", "path", keyPath, "err", err)
			return
		}
		tmpPath := tmpFile.Name()
		hexEncoded := hex.EncodeToString(encryptionKey)
		if _, err := tmpFile.WriteString(hexEncoded + "\n"); err != nil {
			slog.Warn("Failed to write agent key to temp file; key will not persist", "tmp", tmpPath, "err", err)
			tmpFile.Close()
			_ = os.Remove(tmpPath)
			return
		}
		if err := tmpFile.Sync(); err != nil {
			slog.Warn("Failed to sync agent key temp file; key may not be persisted", "tmp", tmpPath, "err", err)
			// continue with close/rename attempts
		}
		if err := tmpFile.Close(); err != nil {
			slog.Warn("Failed to close agent key temp file; key may not persist", "tmp", tmpPath, "err", err)
			_ = os.Remove(tmpPath)
			return
		}

		// Ensure file mode 0600 after rename
		if err := os.Rename(tmpPath, keyPath); err != nil {
			slog.Warn("Failed to rename agent key temp file into place; key will not persist", "tmp", tmpPath, "dest", keyPath, "err", err)
			_ = os.Remove(tmpPath)
			return
		}
		if err := os.Chmod(keyPath, 0600); err != nil {
			slog.Warn("Failed to set permissions on agent key file; permissions may be too permissive", "path", keyPath, "err", err)
		}
		slog.Info("Generated and persisted new agent encryption key", "path", keyPath)
		return
	}

	// Non-agent mode and no explicit key provided
	if cfg.Environment == "production" {
		// In production non-agent mode a key is required
		panic("ENCRYPTION_KEY is required in production environment")
	}

	// Development fallback: derive deterministic key to avoid forcing env setup
	{
		slog.Warn("No ENCRYPTION_KEY provided; deriving development key")
		sum := sha256.Sum256([]byte("arcane-dev-key"))
		encryptionKey = sum[:]
		slog.Info("Encryption initialized (derived development key)", "env", cfg.Environment, "key_length_bytes", len(encryptionKey))
		return
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
	if _, err = io.ReadFull(crand.Reader, nonce); err != nil {
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
