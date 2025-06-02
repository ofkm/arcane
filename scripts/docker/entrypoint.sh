#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# If we aren't running as root, just exec the CMD
if [ "$(id -u)" -ne 0 ]; then
    exec "$@"
fi

echo "Entrypoint: Setting up user and permissions..."

# Default PUID/PGID if not provided
PUID=${PUID:-2000}
PGID=${PGID:-2000}
DOCKER_GID=${DOCKER_GID:-998}
APP_USER="arcane"
APP_GROUP_FALLBACK="arcane" # Fallback group name if PGID group exists with different name
APP_DIR="/app"
DATA_DIR="${APP_DIR}/data"

echo "Entrypoint: Using PUID=${PUID}, PGID=${PGID}, DOCKER_GID=${DOCKER_GID}"

# Determine the group name for PGID
if getent group "$PGID" > /dev/null 2>&1; then
    APP_GROUP=$(getent group "$PGID" | cut -d: -f1)
    echo "Entrypoint: Group with GID ${PGID} already exists: ${APP_GROUP}"
else
    APP_GROUP="$APP_GROUP_FALLBACK"
    echo "Entrypoint: Creating group ${APP_GROUP} with GID ${PGID}..."
    addgroup -g "$PGID" "$APP_GROUP"
fi

# Ensure the docker group exists with correct GID
if ! getent group docker > /dev/null 2>&1; then
    echo "Entrypoint: Creating docker group with GID ${DOCKER_GID}..."
    addgroup -g "$DOCKER_GID" docker
else
    CURRENT_DOCKER_GID=$(getent group docker | cut -d: -f3)
    if [ "$CURRENT_DOCKER_GID" != "$DOCKER_GID" ]; then
        echo "Entrypoint: Updating docker group from GID ${CURRENT_DOCKER_GID} to ${DOCKER_GID}..."
        groupmod -g "$DOCKER_GID" docker
    fi
fi

# Create the arcane user if it doesn't exist or ensure it uses the correct PUID/PGID
if getent passwd "$PUID" > /dev/null 2>&1; then
    USERNAME=$(getent passwd "$PUID" | cut -d: -f1)
    echo "Entrypoint: User with UID ${PUID} already exists: ${USERNAME}"
    
    # Ensure existing user is part of the target APP_GROUP
    if ! id -nG "$USERNAME" | grep -qw "$APP_GROUP"; then
        echo "Entrypoint: Adding user ${USERNAME} (UID ${PUID}) to group ${APP_GROUP} (GID ${PGID})..."
        usermod -a -G "$APP_GROUP" "$USERNAME"
    fi
    # Ensure primary group is correct
    if [ "$(id -g "$USERNAME")" != "$PGID" ]; then
        echo "Entrypoint: Setting primary group for ${USERNAME} (UID ${PUID}) to ${APP_GROUP} (GID ${PGID})..."
        usermod -g "$PGID" "$USERNAME"
    fi

    # If username is not 'arcane', and not 'root', consider renaming
    if [ "$USERNAME" != "$APP_USER" ] && [ "$USERNAME" != "root" ]; then
        echo "Entrypoint: Renaming user from ${USERNAME} to ${APP_USER} (UID ${PUID})..."
        usermod -l "$APP_USER" "$USERNAME"
    fi
else
    echo "Entrypoint: Creating user ${APP_USER} with UID ${PUID} and GID ${PGID}..."
    adduser -D -u "$PUID" -G "$APP_GROUP" "$APP_USER"
fi

# Ensure arcane user is in the docker group
if ! id -nG "$APP_USER" | grep -qw "docker"; then
    echo "Entrypoint: Adding ${APP_USER} to the docker group..."
    addgroup "$APP_USER" docker
fi

# Fix permissions for the Docker socket if it exists
if [ -S /var/run/docker.sock ]; then
    SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
    if [ "${SOCKET_GID}" != "$(getent group docker | cut -d: -f3)" ]; then
        echo "Docker socket GID (${SOCKET_GID}) doesn't match configured docker group GID."
        echo "Updating docker group to match socket GID: ${SOCKET_GID}"
        delgroup docker >/dev/null 2>&1 || true
        addgroup -g "${SOCKET_GID}" docker
        adduser "$APP_USER" docker
    fi
    echo "Docker socket accessible at /var/run/docker.sock (GID: $(getent group docker | cut -d: -f3))"
else
    echo "WARNING: Docker socket not found at /var/run/docker.sock"
    echo "Make sure to mount the Docker socket when running this container"
fi

# Ensure data directory exists and set ownership
echo "Entrypoint: Ensuring data directory exists and setting ownership..."
mkdir -p "$DATA_DIR"
chown -R "${PUID}:${PGID}" "$DATA_DIR"

echo "Entrypoint: Setup complete. Executing command as user ${APP_USER} (UID: ${PUID}, GID: ${PGID})..."
# exec su-exec "$APP_USER" "npx drizzle-kit push --force" 
exec su-exec "$APP_USER" "$@"
