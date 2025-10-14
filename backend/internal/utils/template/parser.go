package template

import (
	"bufio"
	"strings"

	"github.com/ofkm/arcane-backend/internal/dto"
)

// ParseEnvContent parses environment variables from .env file content
func ParseEnvContent(content string) []dto.EnvVariable {
	if content == "" {
		return []dto.EnvVariable{}
	}

	var vars []dto.EnvVariable
	scanner := bufio.NewScanner(strings.NewReader(content))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split on first '='
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := ""
		if len(parts) == 2 {
			value = strings.TrimSpace(parts[1])
		}

		// Strip surrounding quotes and handle escapes
		if len(value) >= 2 {
			if strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`) {
				value = value[1 : len(value)-1]
				value = strings.ReplaceAll(value, `\"`, `"`)
			} else if strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`) {
				value = value[1 : len(value)-1]
				value = strings.ReplaceAll(value, `\'`, `'`)
			}
		}

		if key != "" {
			vars = append(vars, dto.EnvVariable{
				Key:   key,
				Value: value,
			})
		}
	}

	return vars
}
