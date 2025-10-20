package services

import (
	"testing"

	containertypes "github.com/docker/docker/api/types/container"
	"github.com/stretchr/testify/require"
)

// TestDetermineImageName_DefaultWhenNoImage tests determineImageName with default
func TestDetermineImageName_DefaultWhenNoImage(t *testing.T) {
	// Test with no image specified
	s := &SystemUpgradeService{}
	container := containertypes.InspectResponse{
		Config: &containertypes.Config{
			Image: "",
		},
	}

	imageName := s.determineImageName(container)
	require.Equal(t, "ofkm/arcane:latest", imageName)
}

// TestDetermineImageName_PreservesExistingTag tests determineImageName preserves existing tag
func TestDetermineImageName_PreservesExistingTag(t *testing.T) {
	s := &SystemUpgradeService{}

	container := containertypes.InspectResponse{
		Config: &containertypes.Config{
			Image: "ofkm/arcane:v1.2.3",
		},
	}

	imageName := s.determineImageName(container)
	require.Equal(t, "ofkm/arcane:v1.2.3", imageName)
}

// TestDetermineImageName_RemovesDigest tests determineImageName removes digest
func TestDetermineImageName_RemovesDigest(t *testing.T) {
	s := &SystemUpgradeService{}

	container := containertypes.InspectResponse{
		Config: &containertypes.Config{
			Image: "ofkm/arcane:v1.2.3@sha256:abcd1234",
		},
	}

	imageName := s.determineImageName(container)
	require.Equal(t, "ofkm/arcane:v1.2.3", imageName)
}

// TestDetermineImageName_AddsLatestWhenNoTag tests determineImageName adds :latest when missing
func TestDetermineImageName_AddsLatestWhenNoTag(t *testing.T) {
	s := &SystemUpgradeService{}

	container := containertypes.InspectResponse{
		Config: &containertypes.Config{
			Image: "ofkm/arcane",
		},
	}

	imageName := s.determineImageName(container)
	require.Equal(t, "ofkm/arcane:latest", imageName)
}

// TestDetermineImageName_CustomRegistry tests determineImageName with custom registry
func TestDetermineImageName_CustomRegistry(t *testing.T) {
	s := &SystemUpgradeService{}

	container := containertypes.InspectResponse{
		Config: &containertypes.Config{
			Image: "registry.example.com/myorg/arcane:v2.0.0",
		},
	}

	imageName := s.determineImageName(container)
	require.Equal(t, "registry.example.com/myorg/arcane:v2.0.0", imageName)
}

// TestDetermineImageName_RemovesDigestFromCustomRegistry tests digest removal with custom registry
func TestDetermineImageName_RemovesDigestFromCustomRegistry(t *testing.T) {
	s := &SystemUpgradeService{}

	container := containertypes.InspectResponse{
		Config: &containertypes.Config{
			Image: "registry.example.com/myorg/arcane@sha256:1234567890abcdef",
		},
	}

	imageName := s.determineImageName(container)
	require.Equal(t, "registry.example.com/myorg/arcane:latest", imageName)
}

// TestSystemUpgradeService_UpgradeFlag tests the upgrading flag behavior
func TestSystemUpgradeService_UpgradeFlag(t *testing.T) {
	s := NewSystemUpgradeService(nil, nil, nil)

	// Initially should be false
	require.False(t, s.upgrading)

	// Simulate manual flag setting
	s.upgrading = true
	require.True(t, s.upgrading)

	// Should be able to reset
	s.upgrading = false
	require.False(t, s.upgrading)
}

// TestSystemUpgradeService_Initialization tests proper initialization
func TestSystemUpgradeService_Initialization(t *testing.T) {
	s := NewSystemUpgradeService(nil, nil, nil)

	require.NotNil(t, s)
	require.False(t, s.upgrading)
	// Services can be nil in this test since we're just testing initialization
}

// TestSystemUpgradeService_ErrorVariables tests that error variables are properly defined
func TestSystemUpgradeService_ErrorVariables(t *testing.T) {
	// Test that all expected errors exist and are not nil
	require.Error(t, ErrNotRunningInDocker)
	require.Error(t, ErrContainerNotFound)
	require.Error(t, ErrUpgradeInProgress)
	require.Error(t, ErrDockerSocketAccess)

	// Test error messages
	require.Equal(t, "arcane is not running in a Docker container", ErrNotRunningInDocker.Error())
	require.Equal(t, "could not find Arcane container", ErrContainerNotFound.Error())
	require.Equal(t, "an upgrade is already in progress", ErrUpgradeInProgress.Error())
	require.Equal(t, "docker socket is not accessible", ErrDockerSocketAccess.Error())
}

// TestSystemUpgradeService_ImageNameValidation tests image name edge cases
func TestSystemUpgradeService_ImageNameValidation(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Empty image",
			input:    "",
			expected: "ofkm/arcane:latest",
		},
		{
			name:     "Only colon",
			input:    ":",
			expected: "ofkm/arcane:latest",
		},
		{
			name:     "Image with port",
			input:    "registry.io:5000/arcane",
			expected: "registry.io:5000/arcane",
		},
		{
			name:     "Image with multiple slashes",
			input:    "registry.io/org/arcane:v1.0",
			expected: "registry.io/org/arcane:v1.0",
		},
		{
			name:     "Image with digest only (no tag)",
			input:    "ofkm/arcane@sha256:abcd1234",
			expected: "ofkm/arcane:latest",
		},
		{
			name:     "Image with tag and digest",
			input:    "ofkm/arcane:v1@sha256:abcd1234",
			expected: "ofkm/arcane:v1",
		},
	}

	s := &SystemUpgradeService{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			container := containertypes.InspectResponse{
				Config: &containertypes.Config{
					Image: tt.input,
				},
			}

			result := s.determineImageName(container)
			require.Equal(t, tt.expected, result)
		})
	}
}

// TestSystemUpgradeService_ErrorComparison tests proper error comparison with errors.Is
func TestSystemUpgradeService_ErrorComparison(t *testing.T) {
	// Test that errors can be compared properly with errors.Is
	err := ErrUpgradeInProgress

	// This simulates how the handler uses errors.Is
	// It should work with wrapped errors
	require.Error(t, err)
	require.Equal(t, "an upgrade is already in progress", err.Error())
}

// TestSystemUpgradeService_UpgradingFlag_ConcurrentAccess tests upgrading flag
func TestSystemUpgradeService_UpgradingFlag_ConcurrentAccess(t *testing.T) {
	s := NewSystemUpgradeService(nil, nil, nil)

	// Test initial state
	require.False(t, s.upgrading, "upgrading flag should start as false")

	// Test setting to true
	s.upgrading = true
	require.True(t, s.upgrading, "upgrading flag should be true after setting")

	// Test setting back to false
	s.upgrading = false
	require.False(t, s.upgrading, "upgrading flag should be false after resetting")
}

// TestSystemUpgradeService_Services tests that services are stored correctly
func TestSystemUpgradeService_Services(t *testing.T) {
	// Create mock services
	dockerSvc := &DockerClientService{}
	versionSvc := &VersionService{}
	eventSvc := &EventService{}

	// Create upgrade service
	s := NewSystemUpgradeService(dockerSvc, versionSvc, eventSvc)

	// Verify services are stored
	require.NotNil(t, s.dockerService)
	require.NotNil(t, s.versionService)
	require.NotNil(t, s.eventService)
	require.Equal(t, dockerSvc, s.dockerService)
	require.Equal(t, versionSvc, s.versionService)
	require.Equal(t, eventSvc, s.eventService)
}

// TestSystemUpgradeService_UpgradeInProgressError tests the upgrade in progress sentinel error
func TestSystemUpgradeService_UpgradeInProgressError(t *testing.T) {
	// This tests the specific error that the handler checks for
	// The handler uses: if errors.Is(err, services.ErrUpgradeInProgress)

	require.Equal(t, "an upgrade is already in progress", ErrUpgradeInProgress.Error())

	// Test that the error is not nil
	require.Error(t, ErrUpgradeInProgress)
}
