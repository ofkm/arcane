package cli

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/ofkm/arcane-backend/internal/bootstrap"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/spf13/cobra"
)

const (
	appUser  = "arcane"
	appGroup = "arcane"

	defaultPUID      = 2000
	defaultPGID      = 2000
	defaultDockerGID = 998
	defaultDataDir   = "/app/data"

	bootstrapTimeout = 5 * time.Minute
)

type BootstrapConfig struct {
	PUID        int
	PGID        int
	DockerGID   int
	DataDir     string
	ProjectsDir string
}

type systemManager struct {
	ctx context.Context
}

func newSystemManager(ctx context.Context) *systemManager {
	return &systemManager{ctx: ctx}
}

// execCommand is a helper to run system commands with context
func (sm *systemManager) execCommand(name string, args ...string) *exec.Cmd {
	return exec.CommandContext(sm.ctx, name, args...)
}

// groupExists checks if a group with the given GID exists
func (sm *systemManager) groupExists(gid int) (bool, string, error) {
	out, err := sm.execCommand("getent", "group", strconv.Itoa(gid)).Output()
	if err != nil {
		return false, "", nil
	}
	parts := strings.Split(strings.TrimSpace(string(out)), ":")
	if len(parts) > 0 {
		return true, parts[0], nil
	}
	return false, "", nil
}

// userExists checks if a user with the given UID exists
func (sm *systemManager) userExists(uid int) (bool, string, error) {
	out, err := sm.execCommand("getent", "passwd", strconv.Itoa(uid)).Output()
	if err != nil {
		return false, "", nil
	}
	parts := strings.Split(strings.TrimSpace(string(out)), ":")
	if len(parts) > 0 {
		return true, parts[0], nil
	}
	return false, "", nil
}

// createGroup creates a system group
func (sm *systemManager) createGroup(name string, gid int) error {
	slog.InfoContext(sm.ctx, "Creating group", "name", name, "gid", gid)
	cmd := sm.execCommand("addgroup", "-g", strconv.Itoa(gid), name)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to create group: %w, output: %s", err, string(output))
	}
	return nil
}

// createUser creates a system user
func (sm *systemManager) createUser(username, groupname string, uid int) error {
	slog.InfoContext(sm.ctx, "Creating user", "name", username, "uid", uid)
	cmd := sm.execCommand("adduser", "-D", "-u", strconv.Itoa(uid), "-G", groupname, username)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to create user: %w, output: %s", err, string(output))
	}
	return nil
}

// addUserToGroup adds a user to a supplementary group
func (sm *systemManager) addUserToGroup(username, groupname string) error {
	slog.InfoContext(sm.ctx, "Adding user to group", "user", username, "group", groupname)
	return sm.execCommand("addgroup", username, groupname).Run()
}

// getUserGroups returns the groups a user belongs to
func (sm *systemManager) getUserGroups(username string) (string, error) {
	out, err := sm.execCommand("id", "-nG", username).Output()
	return string(out), err
}

// setupGroup ensures the arcane group exists with the correct GID
func (sm *systemManager) setupGroup(cfg *BootstrapConfig) error {
	exists, existingName, err := sm.groupExists(cfg.PGID)
	if err != nil {
		return err
	}

	if exists {
		if existingName != appGroup {
			slog.InfoContext(sm.ctx, "Group with GID exists, using it", "gid", cfg.PGID, "name", existingName)
		} else {
			slog.InfoContext(sm.ctx, "Group already exists", "name", appGroup, "gid", cfg.PGID)
		}
		return nil
	}

	return sm.createGroup(appGroup, cfg.PGID)
}

// setupUser ensures the arcane user exists with the correct UID
func (sm *systemManager) setupUser(cfg *BootstrapConfig) error {
	exists, existingName, err := sm.userExists(cfg.PUID)
	if err != nil {
		return err
	}

	if exists {
		if existingName != appUser && existingName != "root" {
			slog.InfoContext(sm.ctx, "Renaming user", "from", existingName, "to", appUser)
			cmd := sm.execCommand("usermod", "-l", appUser, "-g", strconv.Itoa(cfg.PGID), existingName)
			if err := cmd.Run(); err != nil {
				slog.WarnContext(sm.ctx, "Failed to rename user", "error", err)
			}
		} else if existingName == appUser {
			slog.InfoContext(sm.ctx, "User already exists", "name", appUser, "uid", cfg.PUID)
			cmd := sm.execCommand("usermod", "-g", strconv.Itoa(cfg.PGID), appUser)
			if err := cmd.Run(); err != nil {
				slog.WarnContext(sm.ctx, "Failed to update user group", "error", err)
			}
		}
		return nil
	}

	return sm.createUser(appUser, appGroup, cfg.PUID)
}

// setupDockerSocket configures Docker socket access
func (sm *systemManager) setupDockerSocket(cfg *BootstrapConfig) error {
	dockerHost := os.Getenv("DOCKER_HOST")
	if dockerHost != "" && strings.HasPrefix(dockerHost, "tcp://") {
		slog.InfoContext(sm.ctx, "Docker proxy mode detected, skipping socket setup", "DOCKER_HOST", dockerHost)
		return nil
	}

	socketPath := "/var/run/docker.sock"
	socketGID, err := sm.getDockerSocketGID(socketPath, cfg.DockerGID)
	if err != nil {
		return err
	}

	if socketGID == 0 {
		return sm.addUserToRootGroup()
	}

	return sm.configureDockerGroup(socketGID)
}

// getDockerSocketGID retrieves the Docker socket GID or returns default if not found
func (sm *systemManager) getDockerSocketGID(socketPath string, defaultGID int) (int, error) {
	info, err := os.Stat(socketPath)
	if err != nil {
		slog.WarnContext(sm.ctx, "Docker socket not found", "path", socketPath)
		if _, err := sm.execCommand("getent", "group", "docker").Output(); err != nil {
			slog.InfoContext(sm.ctx, "Creating docker group", "gid", defaultGID)
			sm.execCommand("addgroup", "-g", strconv.Itoa(defaultGID), "docker").Run()
			sm.addUserToGroup(appUser, "docker")
		}
		return defaultGID, nil
	}

	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return 0, fmt.Errorf("failed to get socket stat")
	}

	socketGID := int(stat.Gid)
	slog.InfoContext(sm.ctx, "Docker socket found", "gid", socketGID)
	return socketGID, nil
}

// addUserToRootGroup adds the arcane user to the root group
func (sm *systemManager) addUserToRootGroup() error {
	slog.InfoContext(sm.ctx, "Docker socket owned by root group, adding user to root group", "user", appUser)
	if output, err := sm.execCommand("addgroup", appUser, "root").CombinedOutput(); err != nil {
		slog.WarnContext(sm.ctx, "Failed to add user to root group", "error", err, "output", string(output))
	}
	slog.InfoContext(sm.ctx, "Docker socket configured using root group")
	return nil
}

// configureDockerGroup creates or updates the docker group and adds the user
func (sm *systemManager) configureDockerGroup(socketGID int) error {
	out, err := sm.execCommand("getent", "group", "docker").Output()
	if err == nil {
		if err := sm.updateDockerGroupGID(out, socketGID); err != nil {
			return err
		}
	} else {
		slog.InfoContext(sm.ctx, "Creating docker group", "gid", socketGID)
		sm.execCommand("addgroup", "-g", strconv.Itoa(socketGID), "docker").Run()
	}

	groups, _ := sm.getUserGroups(appUser)
	if !strings.Contains(groups, "docker") {
		sm.addUserToGroup(appUser, "docker")
	}

	slog.InfoContext(sm.ctx, "Docker socket configured", "gid", socketGID)
	return nil
}

// updateDockerGroupGID updates the docker group GID if it doesn't match
func (sm *systemManager) updateDockerGroupGID(groupInfo []byte, targetGID int) error {
	parts := strings.Split(strings.TrimSpace(string(groupInfo)), ":")
	if len(parts) >= 3 {
		currentGID, _ := strconv.Atoi(parts[2])
		if currentGID != targetGID {
			slog.InfoContext(sm.ctx, "Updating docker group GID", "from", currentGID, "to", targetGID)
			cmd := sm.execCommand("groupmod", "-g", strconv.Itoa(targetGID), "docker")
			if err := cmd.Run(); err != nil {
				sm.execCommand("delgroup", "docker").Run()
				sm.execCommand("addgroup", "-g", strconv.Itoa(targetGID), "docker").Run()
			}
		}
	}
	return nil
}

// setupDataDirectory sets up the data directory with correct permissions
func (sm *systemManager) setupDataDirectory(cfg *BootstrapConfig) error {
	slog.InfoContext(sm.ctx, "Setting up data directory")

	if err := os.MkdirAll(cfg.DataDir, 0775); err != nil {
		return fmt.Errorf("failed to create data directory: %w", err)
	}

	sm.configureDataDirOwnership(cfg)
	sm.configureProjectsAccess(cfg)
	os.Chown("/app", cfg.PUID, cfg.PGID)

	return nil
}

// configureDataDirOwnership sets ownership for data directory
func (sm *systemManager) configureDataDirOwnership(cfg *BootstrapConfig) {
	if err := os.Chown(cfg.DataDir, cfg.PUID, cfg.PGID); err != nil {
		slog.WarnContext(sm.ctx, "Failed to chown data directory", "path", cfg.DataDir, "error", err)
	}
	os.Chmod(cfg.DataDir, 0775)

	skipProjectsChown := sm.isMountpoint(cfg.ProjectsDir)
	if skipProjectsChown {
		slog.InfoContext(sm.ctx, "Detected bind-mounted projects, skipping recursive chown", "path", cfg.ProjectsDir)
		entries, _ := os.ReadDir(cfg.DataDir)
		for _, entry := range entries {
			entryPath := filepath.Join(cfg.DataDir, entry.Name())
			if entryPath != cfg.ProjectsDir {
				sm.chownRecursive(entryPath, cfg.PUID, cfg.PGID)
			}
		}
	} else {
		sm.chownRecursive(cfg.DataDir, cfg.PUID, cfg.PGID)
	}
}

// configureProjectsAccess sets up group-based access for projects directory
func (sm *systemManager) configureProjectsAccess(cfg *BootstrapConfig) {
	info, err := os.Stat(cfg.ProjectsDir)
	if err != nil {
		return
	}

	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return
	}

	prjGID := int(stat.Gid)
	slog.InfoContext(sm.ctx, "Projects path GID", "gid", prjGID)

	hostGroup := sm.ensureProjectsGroup(prjGID)
	sm.addUserToProjectsGroup(hostGroup)
	sm.checkProjectsWritability(cfg.ProjectsDir)
}

// ensureProjectsGroup ensures the projects group exists
func (sm *systemManager) ensureProjectsGroup(gid int) string {
	out, err := sm.execCommand("getent", "group", strconv.Itoa(gid)).Output()
	if err == nil {
		parts := strings.Split(strings.TrimSpace(string(out)), ":")
		return parts[0]
	}

	hostGroup := fmt.Sprintf("hostgid_%d", gid)
	slog.InfoContext(sm.ctx, "Creating group for projects access", "name", hostGroup, "gid", gid)
	sm.execCommand("addgroup", "-g", strconv.Itoa(gid), hostGroup).Run()
	return hostGroup
}

// addUserToProjectsGroup adds the user to the projects group if needed
func (sm *systemManager) addUserToProjectsGroup(groupName string) {
	groups, _ := sm.getUserGroups(appUser)
	if !strings.Contains(groups, groupName) {
		slog.InfoContext(sm.ctx, "Adding user to projects group", "user", appUser, "group", groupName)
		sm.execCommand("addgroup", appUser, groupName).Run()
	}
}

// checkProjectsWritability verifies the projects directory is writable
func (sm *systemManager) checkProjectsWritability(path string) {
	testCmd := sm.execCommand("su-exec", appUser, "sh", "-c", fmt.Sprintf("test -w '%s'", path))
	if err := testCmd.Run(); err != nil {
		slog.WarnContext(sm.ctx, "Projects directory not writable by user", "path", path, "user", appUser)
	}
}

// verifyPermissions verifies the data directory is writable
func (sm *systemManager) verifyPermissions(cfg *BootstrapConfig) error {
	testFile := filepath.Join(cfg.DataDir, ".rwtest")
	testCmd := sm.execCommand("su-exec", appUser, "sh", "-c",
		fmt.Sprintf("test -w '%s' && touch '%s' && rm -f '%s'", cfg.DataDir, testFile, testFile))
	if err := testCmd.Run(); err != nil {
		return fmt.Errorf("%s is not writable by %s. Check volume permissions", cfg.DataDir, appUser)
	}
	return nil
}

// isMountpoint checks if a path is a mountpoint
func (sm *systemManager) isMountpoint(path string) bool {
	cmd := sm.execCommand("mountpoint", "-q", path)
	return cmd.Run() == nil
}

// chownRecursive recursively changes ownership of files
func (sm *systemManager) chownRecursive(path string, uid, gid int) {
	filepath.WalkDir(path, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if sm.ctx.Err() != nil {
			return sm.ctx.Err()
		}
		os.Chown(p, uid, gid)
		return nil
	})
}

func init() {
	rootCmd.AddCommand(bootstrapCmd)
}

var bootstrapCmd = &cobra.Command{
	Use:   "bootstrap",
	Short: "Bootstrap Arcane environment (user setup, permissions, directories)",
	Long:  `Sets up users, groups, Docker socket permissions, and data directories for Arcane.`,
	RunE:  runBootstrap,
}

func runBootstrap(cmd *cobra.Command, args []string) error {
	if os.Geteuid() != 0 {
		return fmt.Errorf("bootstrap command must be run as root")
	}

	_ = godotenv.Load()
	cfg := config.Load()
	bootstrap.SetupGinLogger(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), bootstrapTimeout)
	defer cancel()

	bootstrapConfig := loadBootstrapConfig()

	slog.InfoContext(ctx, "Bootstrap starting",
		"PUID", bootstrapConfig.PUID,
		"PGID", bootstrapConfig.PGID,
		"DOCKER_GID", bootstrapConfig.DockerGID)

	sm := newSystemManager(ctx)

	steps := []struct {
		name string
		fn   func(*BootstrapConfig) error
	}{
		{"setup group", sm.setupGroup},
		{"setup user", sm.setupUser},
		{"setup docker socket", sm.setupDockerSocket},
		{"setup data directory", sm.setupDataDirectory},
		{"verify permissions", sm.verifyPermissions},
	}

	for _, step := range steps {
		if err := step.fn(bootstrapConfig); err != nil {
			return fmt.Errorf("failed to %s: %w", step.name, err)
		}
	}

	slog.InfoContext(ctx, "Bootstrap complete")

	// Execute the main application as the arcane user
	if len(args) > 0 {
		slog.InfoContext(ctx, "Starting application", "user", appUser, "uid", bootstrapConfig.PUID, "gid", bootstrapConfig.PGID, "args", args)

		// Build the command: su-exec <user> <args...>
		execArgs := append([]string{"su-exec", appUser}, args...)
		return syscall.Exec("/sbin/su-exec", execArgs, os.Environ())
	}

	return nil
}

func loadBootstrapConfig() *BootstrapConfig {
	cfg := &BootstrapConfig{
		PUID:      config.GetIntEnvOrDefault("PUID", defaultPUID),
		PGID:      config.GetIntEnvOrDefault("PGID", defaultPGID),
		DockerGID: config.GetIntEnvOrDefault("DOCKER_GID", defaultDockerGID),
		DataDir:   config.GetEnvOrDefault("DATA_DIR", defaultDataDir),
	}
	cfg.ProjectsDir = config.GetEnvOrDefault("PROJECTS_DIR", filepath.Join(cfg.DataDir, "projects"))
	return cfg
}
