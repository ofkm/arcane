package docker

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/ofkm/arcane-backend/internal/models"
)

type dockerErrorMessage struct {
	Message string `json:"message"`
}

func ExtractDockerError(err error) error {
	if err == nil {
		return nil
	}

	var dockerAPIErr *models.DockerAPIError
	if errors.As(err, &dockerAPIErr) {
		return dockerAPIErr
	}

	errStr := err.Error()

	if strings.Contains(errStr, "Error response from daemon:") {
		parts := strings.SplitN(errStr, "Error response from daemon:", 2)
		if len(parts) == 2 {
			message := strings.TrimSpace(parts[1])

			if strings.HasPrefix(message, "{") {
				var dockerErr dockerErrorMessage
				if jsonErr := json.Unmarshal([]byte(message), &dockerErr); jsonErr == nil && dockerErr.Message != "" {
					return &models.DockerAPIError{
						Message:    dockerErr.Message,
						StatusCode: 500,
					}
				}
			}

			return &models.DockerAPIError{
				Message:    message,
				StatusCode: 500,
			}
		}
	}

	if strings.Contains(errStr, "No such container:") {
		containerID := strings.TrimSpace(strings.TrimPrefix(errStr, "Error: No such container:"))
		return &models.DockerAPIError{
			Message:    fmt.Sprintf("Container not found: %s", containerID),
			StatusCode: 404,
		}
	}

	if strings.Contains(errStr, "No such image:") {
		imageName := strings.TrimSpace(strings.TrimPrefix(errStr, "Error: No such image:"))
		return &models.DockerAPIError{
			Message:    fmt.Sprintf("Image not found: %s", imageName),
			StatusCode: 404,
		}
	}

	if strings.Contains(errStr, "No such network:") {
		networkName := strings.TrimSpace(strings.TrimPrefix(errStr, "Error: No such network:"))
		return &models.DockerAPIError{
			Message:    fmt.Sprintf("Network not found: %s", networkName),
			StatusCode: 404,
		}
	}

	if strings.Contains(errStr, "No such volume:") {
		volumeName := strings.TrimSpace(strings.TrimPrefix(errStr, "Error: No such volume:"))
		return &models.DockerAPIError{
			Message:    fmt.Sprintf("Volume not found: %s", volumeName),
			StatusCode: 404,
		}
	}

	if strings.Contains(errStr, "container already exists") || strings.Contains(errStr, "Conflict") {
		return &models.DockerAPIError{
			Message:    "A resource with this name already exists",
			StatusCode: 409,
		}
	}

	if strings.Contains(errStr, "is already in use by container") {
		return &models.DockerAPIError{
			Message:    errStr,
			StatusCode: 409,
		}
	}

	if strings.Contains(errStr, "cannot connect to the Docker daemon") {
		return &models.DockerAPIError{
			Message:    "Cannot connect to Docker daemon. Is Docker running?",
			StatusCode: 503,
		}
	}

	if strings.Contains(errStr, "timeout") || strings.Contains(errStr, "deadline exceeded") {
		return &models.DockerAPIError{
			Message:    "Docker operation timed out. Please try again.",
			StatusCode: 504,
		}
	}

	return &models.DockerAPIError{
		Message:    errStr,
		StatusCode: 500,
	}
}

func WrapDockerError(err error, context string) error {
	if err == nil {
		return nil
	}

	dockerErr := ExtractDockerError(err)
	var dockerAPIErr *models.DockerAPIError
	if errors.As(dockerErr, &dockerAPIErr) {
		return &models.DockerAPIError{
			Message:    fmt.Sprintf("%s: %s", context, dockerAPIErr.Message),
			StatusCode: dockerAPIErr.StatusCode,
			Details:    dockerAPIErr.Details,
		}
	}

	return fmt.Errorf("%s: %w", context, err)
}
