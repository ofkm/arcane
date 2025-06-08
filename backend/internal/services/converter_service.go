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

	// Remove 'docker run' from the beginning
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

	for i := 0; i < len(tokens); i++ {
		token := tokens[i]

		switch token {
		case "-d", "--detach":
			result.Detached = true
		case "-i", "--interactive":
			result.Interactive = true
		case "-t", "--tty":
			result.TTY = true
		case "--rm":
			result.Remove = true
		case "--privileged":
			result.Privileged = true
		case "--name":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --name flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --name flag")
			}
			result.Name = tokens[i]
		case "-p", "--port", "--publish":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for port flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for port flag")
			}
			result.Ports = append(result.Ports, tokens[i])
		case "-v", "--volume":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for volume flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for volume flag")
			}
			result.Volumes = append(result.Volumes, tokens[i])
		case "-e", "--env":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for environment flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for environment flag")
			}
			result.Environment = append(result.Environment, tokens[i])
		case "--network":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --network flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --network flag")
			}
			result.Networks = append(result.Networks, tokens[i])
		case "--restart":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --restart flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --restart flag")
			}
			result.Restart = tokens[i]
		case "-w", "--workdir":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for workdir flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for workdir flag")
			}
			result.Workdir = tokens[i]
		case "-u", "--user":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for user flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for user flag")
			}
			result.User = tokens[i]
		case "--entrypoint":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --entrypoint flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --entrypoint flag")
			}
			result.Entrypoint = tokens[i]
		case "--health-cmd":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --health-cmd flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --health-cmd flag")
			}
			result.HealthCheck = tokens[i]
		case "-m", "--memory":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for memory flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for memory flag")
			}
			result.MemoryLimit = tokens[i]
		case "--cpus":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --cpus flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --cpus flag")
			}
			result.CPULimit = tokens[i]
		case "--label":
			if i+1 >= len(tokens) {
				return nil, fmt.Errorf("missing value for --label flag")
			}
			i++
			if tokens[i] == "" || strings.HasPrefix(tokens[i], "-") {
				return nil, fmt.Errorf("invalid value for --label flag")
			}
			result.Labels = append(result.Labels, tokens[i])
		default:
			if strings.HasPrefix(token, "-") {
				// Handle combined short flags like -dit
				if strings.HasPrefix(token, "-") && !strings.HasPrefix(token, "--") && len(token) > 2 {
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
				} else {
					// Unknown flag - skip it and potential value
					if i+1 < len(tokens) && !strings.HasPrefix(tokens[i+1], "-") && result.Image == "" {
						i++ // Skip potential value
					}
				}
			} else {
				// Token doesn't start with '-', it's either image or command
				if result.Image == "" {
					if token == "" {
						return nil, fmt.Errorf("image name cannot be empty")
					}
					result.Image = token
				} else {
					// Everything from this point forward is part of the command
					remainingTokens := tokens[i:]
					result.Command = strings.Join(remainingTokens, " ")
					break
				}
			}
		}
	}

	if result.Image == "" {
		return nil, fmt.Errorf("no Docker image specified in command")
	}

	return result, nil
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
