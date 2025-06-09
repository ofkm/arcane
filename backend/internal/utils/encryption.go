package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"log"

	"github.com/ofkm/arcane-backend/internal/config"
)

var encryptionKey []byte

// InitEncryption initializes the encryption with the provided config
func InitEncryption(cfg *config.Config) {
	keyString := cfg.EncryptionKey

	if keyString == "" {
		if cfg.Environment == "production" {
			panic("ENCRYPTION_KEY is required in production environment")
		}
		log.Println("WARNING: No encryption key provided, using default development key")
		keyString = "arcane-dev-key-32-characters!!!"
	}

	if len(keyString) != 32 {
		panic(fmt.Sprintf("Encryption key must be exactly 32 characters for AES-256, got %d characters", len(keyString)))
	}

	encryptionKey = []byte(keyString)

	// Log initialization status (but not the actual key)
	if cfg.Environment != "production" {
		log.Printf("Encryption initialized with %d-character key", len(keyString))
	}
}

// Encrypt encrypts plain text using AES-GCM
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

// Decrypt decrypts cipher text using AES-GCM
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

	nonce, ciphertext_bytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext_bytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// IsInitialized returns true if encryption has been initialized
func IsInitialized() bool {
	return encryptionKey != nil
}
