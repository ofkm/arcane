package docker

import (
	"errors"
	"net/http"
	"testing"

	"github.com/ofkm/arcane-backend/internal/models"
)

func TestExtractDockerError(t *testing.T) {
	tests := []struct {
		name           string
		err            error
		expectedMsg    string
		expectedStatus int
	}{
		{
			name:           "No such container error",
			err:            errors.New("Error: No such container: abc123"),
			expectedMsg:    "Container not found: abc123",
			expectedStatus: 404,
		},
		{
			name:           "No such image error",
			err:            errors.New("Error: No such image: nginx:latest"),
			expectedMsg:    "Image not found: nginx:latest",
			expectedStatus: 404,
		},
		{
			name:           "Daemon error response",
			err:            errors.New("Error response from daemon: container already exists"),
			expectedMsg:    "container already exists",
			expectedStatus: 500,
		},
		{
			name:           "Connection error",
			err:            errors.New("cannot connect to the Docker daemon at unix:///var/run/docker.sock"),
			expectedMsg:    "Cannot connect to Docker daemon. Is Docker running?",
			expectedStatus: 503,
		},
		{
			name:           "Timeout error",
			err:            errors.New("context deadline exceeded"),
			expectedMsg:    "Docker operation timed out. Please try again.",
			expectedStatus: 504,
		},
		{
			name:           "Conflict error",
			err:            errors.New("Conflict. The container name is already in use"),
			expectedMsg:    "A resource with this name already exists",
			expectedStatus: 409,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractDockerError(tt.err)

			var dockerErr *models.DockerAPIError
			if !errors.As(result, &dockerErr) {
				t.Fatalf("Expected *models.DockerAPIError, got %T", result)
			}

			if dockerErr.Message != tt.expectedMsg {
				t.Errorf("Expected message %q, got %q", tt.expectedMsg, dockerErr.Message)
			}

			if dockerErr.StatusCode != tt.expectedStatus {
				t.Errorf("Expected status code %d, got %d", tt.expectedStatus, dockerErr.StatusCode)
			}
		})
	}
}

func TestWrapDockerError(t *testing.T) {
	err := errors.New("Error: No such container: abc123")
	wrapped := WrapDockerError(err, "Failed to start container")

	var dockerErr *models.DockerAPIError
	if !errors.As(wrapped, &dockerErr) {
		t.Fatalf("Expected *models.DockerAPIError, got %T", wrapped)
	}

	expected := "Failed to start container: Container not found: abc123"
	if dockerErr.Message != expected {
		t.Errorf("Expected message %q, got %q", expected, dockerErr.Message)
	}

	if dockerErr.StatusCode != http.StatusNotFound {
		t.Errorf("Expected status code %d, got %d", http.StatusNotFound, dockerErr.StatusCode)
	}
}

func TestExtractDockerErrorNil(t *testing.T) {
	result := ExtractDockerError(nil)
	if result != nil {
		t.Errorf("Expected nil for nil input, got %v", result)
	}
}
