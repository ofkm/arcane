package fs

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// GetUserIDs returns the UID and GID from environment variables (PUID/PGID)
// Falls back to current user if not set or invalid
func GetUserIDs() (uid, gid int) {
	uid = os.Getuid()
	gid = os.Getgid()

	if puidStr := os.Getenv("PUID"); puidStr != "" {
		if parsed, err := strconv.Atoi(puidStr); err == nil && parsed > 0 {
			uid = parsed
		}
	}

	if pgidStr := os.Getenv("PGID"); pgidStr != "" {
		if parsed, err := strconv.Atoi(pgidStr); err == nil && parsed > 0 {
			gid = parsed
		}
	}

	return uid, gid
}

// ChownPath changes ownership of a file or directory to PUID/PGID if running as root
func ChownPath(path string) error {
	// Only attempt chown if we're running as root
	if os.Getuid() != 0 {
		return nil
	}

	uid, gid := GetUserIDs()
	if err := os.Chown(path, uid, gid); err != nil {
		return fmt.Errorf("failed to chown %s: %w", path, err)
	}
	return nil
}

// ChownRecursive recursively changes ownership of directory and all contents
func ChownRecursive(path string) error {
	// Only attempt chown if we're running as root
	if os.Getuid() != 0 {
		return nil
	}

	uid, gid := GetUserIDs()
	return filepath.Walk(path, func(name string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return os.Chown(name, uid, gid)
	})
}

// ShouldChown returns true if the process is running as root and should change ownership
func ShouldChown() bool {
	return os.Getuid() == 0
}
