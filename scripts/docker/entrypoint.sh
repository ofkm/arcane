#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# If we aren't running as root, just exec the CMD
if [ "$(id -u)" -ne 0 ]; then
    exec "$@"
fi

echo "Entrypoint: Setting up user and permissions..."

# Default values
PUID=${PUID:-2000}
PGID=${PGID:-2000}
DOCKER_GID=${DOCKER_GID:-998}
APP_USER="arcane"
APP_GROUP="arcane"
DATA_DIR="/app/data"

echo "Entrypoint: Using PUID=${PUID}, PGID=${PGID}, DOCKER_GID=${DOCKER_GID}"

# Create or update the arcane group
if getent group "$PGID" >/dev/null 2>&1; then
    EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)
    if [ "$EXISTING_GROUP" != "$APP_GROUP" ]; then
        echo "Entrypoint: Group with GID ${PGID} exists as '${EXISTING_GROUP}', using it..."
        APP_GROUP="$EXISTING_GROUP"
    fi
else
    echo "Entrypoint: Creating group ${APP_GROUP} with GID ${PGID}..."
    addgroup -g "$PGID" "$APP_GROUP"
fi

# Create or update the arcane user
if getent passwd "$PUID" >/dev/null 2>&1; then
    EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
    if [ "$EXISTING_USER" != "$APP_USER" ] && [ "$EXISTING_USER" != "root" ]; then
        echo "Entrypoint: Renaming user ${EXISTING_USER} to ${APP_USER}..."
        usermod -l "$APP_USER" -g "$PGID" "$EXISTING_USER" 2>/dev/null || true
    elif [ "$EXISTING_USER" = "$APP_USER" ]; then
        echo "Entrypoint: User ${APP_USER} already exists with UID ${PUID}"
        usermod -g "$PGID" "$APP_USER" 2>/dev/null || true
    fi
else
    echo "Entrypoint: Creating user ${APP_USER} with UID ${PUID}..."
    adduser -D -u "$PUID" -G "$APP_GROUP" "$APP_USER"
fi

# Handle Docker socket and group
if [ -S /var/run/docker.sock ]; then
    SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
    echo "Entrypoint: Docker socket found with GID ${SOCKET_GID}"
    
    # Special handling for GID 0 (root group)
    if [ "$SOCKET_GID" = "0" ]; then
        echo "Entrypoint: Docker socket owned by root group (GID 0), adding ${APP_USER} to root group..."
        addgroup "$APP_USER" root
        echo "Entrypoint: Docker socket configured (using root group)"
    else
        # Create or update docker group to match socket GID
        if getent group docker >/dev/null 2>&1; then
            CURRENT_DOCKER_GID=$(getent group docker | cut -d: -f3)
            if [ "$CURRENT_DOCKER_GID" != "$SOCKET_GID" ]; then
                echo "Entrypoint: Updating docker group GID from ${CURRENT_DOCKER_GID} to ${SOCKET_GID}..."
                groupmod -g "$SOCKET_GID" docker 2>/dev/null || {
                    # If groupmod fails, recreate the group
                    delgroup docker 2>/dev/null || true
                    addgroup -g "$SOCKET_GID" docker
                }
            fi
        else
            echo "Entrypoint: Creating docker group with GID ${SOCKET_GID}..."
            addgroup -g "$SOCKET_GID" docker
        fi
        
        # Add arcane user to docker group
        if ! id -nG "$APP_USER" | grep -qw "docker"; then
            echo "Entrypoint: Adding ${APP_USER} to docker group..."
            addgroup "$APP_USER" docker
        fi
        
        echo "Entrypoint: Docker socket configured (GID: ${SOCKET_GID})"
    fi
else
    echo "WARNING: Docker socket not found at /var/run/docker.sock"
    echo "Make sure to mount the Docker socket: -v /var/run/docker.sock:/var/run/docker.sock"
    
    # Still create docker group with default GID for consistency
    if ! getent group docker >/dev/null 2>&1; then
        echo "Entrypoint: Creating docker group with default GID ${DOCKER_GID}..."
        addgroup -g "$DOCKER_GID" docker
        addgroup "$APP_USER" docker
    fi
fi

# Set up data directory
echo "Entrypoint: Setting up data directory..."
mkdir -p "$DATA_DIR"
chown -R "${PUID}:${PGID}" "$DATA_DIR"

# Ensure app directory ownership
chown "${PUID}:${PGID}" /app

echo "Entrypoint: Setup complete. Starting as ${APP_USER} (UID: ${PUID}, GID: ${PGID})"
exec su-exec "$APP_USER" "$@"
