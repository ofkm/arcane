package projects

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"log/slog"
)

func RunComposeAction(ctx context.Context, composeFileFullPath, projectName, action string, extraArgs ...string) (string, error) {
	allowed := map[string]bool{
		"up":      true,
		"down":    true,
		"pull":    true,
		"restart": true,
		"start":   true,
		"stop":    true,
		"logs":    true,
		"deploy":  true,
		"ps":      true,
	}

	action = strings.TrimSpace(strings.ToLower(action))
	if !allowed[action] {
		return "", fmt.Errorf("unsupported compose action: %q", action)
	}

	args := []string{"-f", composeFileFullPath}

	switch action {
	case "up":
		args = append(args, "up", "-d")
	case "deploy":
		args = append(args, "up", "-d", "--remove-orphans")
	case "down":
		args = append(args, "down")
	case "pull":
		args = append(args, "pull")
	case "restart":
		args = append(args, "restart")
	case "start":
		args = append(args, "start")
	case "stop":
		args = append(args, "stop")
	case "logs":
		args = append(args, "logs", "--no-color")
	case "ps":
		args = append(args, "ps", "--format", "json")
	default:
		args = append(args, action)
	}

	if len(extraArgs) > 0 {
		args = append(args, extraArgs...)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", args...)
	cmd.Env = append(os.Environ(), fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", projectName))

	slog.Info("running docker-compose", "cmd", strings.Join(cmd.Args, " "), "project", projectName)

	out, err := cmd.CombinedOutput()
	output := string(out)
	if err != nil {
		slog.Error("docker-compose failed", "err", err, "output", output)
		return output, fmt.Errorf("docker-compose %s failed: %w; output: %s", action, err, output)
	}

	slog.Info("docker-compose completed", "action", action, "project", projectName)
	return output, nil
}
