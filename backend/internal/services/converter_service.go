package services

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/ofkm/arcane-backend/internal/models"
	"gopkg.in/yaml.v3"
)

type ConverterService struct{}

func NewConverterService() *ConverterService {
	return &ConverterService{}
}

// ParseDockerRunCommand parses a docker run command string into structured data
func (s *ConverterService) ParseDockerRunCommand(command string) (*models.DockerRunCommand, error) {
	if command == "" {
		return nil, fmt.Errorf("docker run command must be a non-empty string")
	}

	cmd := strings.TrimSpace(command)
	cmd = regexp.MustCompile(`^docker\s+run\s+`).ReplaceAllString(cmd, "")

	if cmd == "" {
		return nil, fmt.Errorf("no arguments found after 'docker run'")
	}

	result := &models.DockerRunCommand{}
	tokens, err := s.parseCommandTokens(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to parse command tokens: %w", err)
	}

	if len(tokens) == 0 {
		return nil, fmt.Errorf("no valid tokens found in docker run command")
	}

	if err := s.parseTokens(tokens, result); err != nil {
		return nil, err
	}

	if result.Image == "" {
		return nil, fmt.Errorf("no Docker image specified in command")
	}

	return result, nil
}

func (s *ConverterService) parseTokens(tokens []string, result *models.DockerRunCommand) error {
	for i := 0; i < len(tokens); i++ {
		token := tokens[i]

		if strings.HasPrefix(token, "-") {
			advance, err := s.parseFlag(token, tokens, i, result)
			if err != nil {
				return err
			}
			i += advance
		} else {
			if result.Image == "" {
				if token == "" {
					return fmt.Errorf("image name cannot be empty")
				}
				result.Image = token
			} else {
				remainingTokens := tokens[i:]
				result.Command = strings.Join(remainingTokens, " ")
				break
			}
		}
	}
	return nil
}

func (s *ConverterService) parseFlag(token string, tokens []string, index int, result *models.DockerRunCommand) (int, error) {
	switch token {
	case "-d", "--detach":
		result.Detached = true
		return 0, nil
	case "-i", "--interactive":
		result.Interactive = true
		return 0, nil
	case "-t", "--tty":
		result.TTY = true
		return 0, nil
	case "--rm":
		result.Remove = true
		return 0, nil
	case "--privileged":
		result.Privileged = true
		return 0, nil
	default:
		return s.parseFlagWithValue(token, tokens, index, result)
	}
}

func (s *ConverterService) parseFlagWithValue(token string, tokens []string, index int, result *models.DockerRunCommand) (int, error) {
	switch token {
	case "--name":
		return s.parseStringFlag(token, tokens, index, &result.Name)
	case "-p", "--port", "--publish":
		return s.parseSliceFlag(token, tokens, index, &result.Ports)
	case "-v", "--volume":
		return s.parseSliceFlag(token, tokens, index, &result.Volumes)
	case "-e", "--env":
		return s.parseSliceFlag(token, tokens, index, &result.Environment)
	case "--network":
		return s.parseSliceFlag(token, tokens, index, &result.Networks)
	case "--restart":
		return s.parseStringFlag(token, tokens, index, &result.Restart)
	case "-w", "--workdir":
		return s.parseStringFlag(token, tokens, index, &result.Workdir)
	case "-u", "--user":
		return s.parseStringFlag(token, tokens, index, &result.User)
	case "--entrypoint":
		return s.parseStringFlag(token, tokens, index, &result.Entrypoint)
	case "--health-cmd":
		return s.parseStringFlag(token, tokens, index, &result.HealthCheck)
	case "-m", "--memory":
		return s.parseStringFlag(token, tokens, index, &result.MemoryLimit)
	case "--cpus":
		return s.parseStringFlag(token, tokens, index, &result.CPULimit)
	case "--label":
		return s.parseSliceFlag(token, tokens, index, &result.Labels)
	default:
		return s.parseUnknownFlag(token, tokens, index, result)
	}
}

func (s *ConverterService) parseStringFlag(flagName string, tokens []string, index int, target *string) (int, error) {
	if index+1 >= len(tokens) {
		return 0, fmt.Errorf("missing value for %s flag", flagName)
	}

	value := tokens[index+1]
	if value == "" || strings.HasPrefix(value, "-") {
		return 0, fmt.Errorf("invalid value for %s flag", flagName)
	}

	*target = value
	return 1, nil
}

func (s *ConverterService) parseSliceFlag(flagName string, tokens []string, index int, target *[]string) (int, error) {
	if index+1 >= len(tokens) {
		return 0, fmt.Errorf("missing value for %s flag", flagName)
	}

	value := tokens[index+1]
	if value == "" || strings.HasPrefix(value, "-") {
		return 0, fmt.Errorf("invalid value for %s flag", flagName)
	}

	*target = append(*target, value)
	return 1, nil
}

func (s *ConverterService) parseUnknownFlag(token string, tokens []string, index int, result *models.DockerRunCommand) (int, error) {
	if !strings.HasPrefix(token, "--") && len(token) > 2 {
		s.parseCombinedFlags(token, result)
		return 0, nil
	}

	if index+1 < len(tokens) && !strings.HasPrefix(tokens[index+1], "-") && result.Image == "" {
		return 1, nil
	}

	return 0, nil
}

func (s *ConverterService) parseCombinedFlags(token string, result *models.DockerRunCommand) {
	flags := strings.Split(token[1:], "")
	for _, flag := range flags {
		switch flag {
		case "d":
			result.Detached = true
		case "i":
			result.Interactive = true
		case "t":
			result.TTY = true
		}
	}
}

// ConvertToDockerCompose converts a parsed docker run command to docker-compose YAML
func (s *ConverterService) ConvertToDockerCompose(parsed *models.DockerRunCommand) (string, string, string, error) {
	if parsed.Image == "" {
		return "", "", "", fmt.Errorf("cannot convert to Docker Compose: no image specified")
	}

	serviceName := parsed.Name
	if serviceName == "" {
		serviceName = "app"
	}

	service := models.DockerComposeService{
		Image: parsed.Image,
	}

	if parsed.Name != "" {
		service.ContainerName = parsed.Name
	}

	if len(parsed.Ports) > 0 {
		service.Ports = parsed.Ports
	}

	if len(parsed.Volumes) > 0 {
		service.Volumes = parsed.Volumes
	}

	if len(parsed.Environment) > 0 {
		service.Environment = parsed.Environment
	}

	if len(parsed.Networks) > 0 {
		service.Networks = parsed.Networks
	}

	if parsed.Restart != "" {
		service.Restart = parsed.Restart
	}

	if parsed.Workdir != "" {
		service.WorkingDir = parsed.Workdir
	}

	if parsed.User != "" {
		service.User = parsed.User
	}

	if parsed.Entrypoint != "" {
		service.Entrypoint = parsed.Entrypoint
	}

	if parsed.Command != "" {
		service.Command = parsed.Command
	}

	if parsed.Interactive && parsed.TTY {
		service.StdinOpen = true
		service.TTY = true
	}

	if parsed.Privileged {
		service.Privileged = true
	}

	if len(parsed.Labels) > 0 {
		service.Labels = parsed.Labels
	}

	if parsed.HealthCheck != "" {
		service.Healthcheck = &models.DockerComposeHealthcheck{
			Test: parsed.HealthCheck,
		}
	}

	if parsed.MemoryLimit != "" || parsed.CPULimit != "" {
		service.Deploy = &models.DockerComposeDeploy{
			Resources: &models.DockerComposeResources{
				Limits: &models.DockerComposeResourceLimits{},
			},
		}
		if parsed.MemoryLimit != "" {
			service.Deploy.Resources.Limits.Memory = parsed.MemoryLimit
		}
		if parsed.CPULimit != "" {
			service.Deploy.Resources.Limits.CPUs = parsed.CPULimit
		}
	}

	compose := models.DockerComposeConfig{
		Services: map[string]models.DockerComposeService{
			serviceName: service,
		},
	}

	// Convert to YAML
	yamlData, err := yaml.Marshal(&compose)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to convert to YAML: %w", err)
	}

	// Generate environment variables file content
	envVars := strings.Join(parsed.Environment, "\n")

	return string(yamlData), envVars, serviceName, nil
}

// parseCommandTokens parses command string into tokens, handling quotes
func (s *ConverterService) parseCommandTokens(command string) ([]string, error) {
	var tokens []string
	var current strings.Builder
	inQuotes := false
	var quoteChar rune

	for i, char := range command {
		switch {
		case (char == '"' || char == '\'') && !inQuotes:
			inQuotes = true
			quoteChar = char
		case char == quoteChar && inQuotes:
			inQuotes = false
			quoteChar = 0
		case char == ' ' && !inQuotes:
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
		default:
			current.WriteRune(char)
		}

		// Check for unclosed quotes at end
		if i == len(command)-1 && inQuotes {
			return nil, fmt.Errorf("unclosed quote in command: missing closing %c", quoteChar)
		}
	}

	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens, nil
}
