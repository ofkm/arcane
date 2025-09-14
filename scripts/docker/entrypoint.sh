#!/bin/sh
set -e

# If we aren't running as root, just exec the CMD
if [ "$(id -u)" -ne 0 ]; then
    exec "$@"
fi

echo "Entrypoint: Setting up user and permissions..."

PUID=${PUID:-2000}
PGID=${PGID:-2000}
DOCKER_GID=${DOCKER_GID:-998}
APP_USER="arcane"
APP_GROUP="arcane"
DATA_DIR="/app/data"
PROJECTS_DIR="${PROJECTS_DIR:-$DATA_DIR/projects}"

echo "Entrypoint: Using PUID=${PUID}, PGID=${PGID}, DOCKER_GID=${DOCKER_GID}"

# Create or update group
if getent group "$PGID" >/dev/null 2>&1; then
    EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)
    [ "$EXISTING_GROUP" != "$APP_GROUP" ] && APP_GROUP="$EXISTING_GROUP"
else
    addgroup -g "$PGID" "$APP_GROUP"
fi

# Create or update user
if getent passwd "$PUID" >/dev/null 2>&1; then
    EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
    if [ "$EXISTING_USER" != "$APP_USER" ] && [ "$EXISTING_USER" != "root" ]; then
        usermod -l "$APP_USER" -g "$PGID" "$EXISTING_USER" 2>/dev/null || true
    else
        usermod -g "$PGID" "$APP_USER" 2>/dev/null || true
    fi
else
    adduser -D -u "$PUID" -G "$APP_GROUP" "$APP_USER"
fi

# Docker socket group mapping
if [ -S /var/run/docker.sock ]; then
    SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
    if [ "$SOCKET_GID" = "0" ]; then
        addgroup "$APP_USER" root || true
    else
        if getent group docker >/dev/null 2>&1; then
            CURRENT_DOCKER_GID=$(getent group docker | cut -d: -f3)
            if [ "$CURRENT_DOCKER_GID" != "$SOCKET_GID" ]; then
                groupmod -g "$SOCKET_GID" docker 2>/dev/null || {
                    delgroup docker 2>/dev/null || true
                    addgroup -g "$SOCKET_GID" docker
                }
            fi
        else
            addgroup -g "$SOCKET_GID" docker
        fi
        addgroup "$APP_USER" docker 2>/dev/null || true
    fi
else
    if ! getent group docker >/dev/null 2>&1; then
        addgroup -g "$DOCKER_GID" docker
        addgroup "$APP_USER" docker
    fi
fi

is_mountpoint() {
    local p="$1"
    if command -v mountpoint >/dev/null 2>&1; then
        mountpoint -q -- "$p"
        return $?
    fi
    local dev_self dev_parent
    dev_self=$(stat -c '%d' -- "$p" 2>/dev/null || echo "")
    dev_parent=$(stat -c '%d' -- "$(dirname -- "$p")" 2>/dev/null || echo "")
    [ -n "$dev_self" ] && [ -n "$dev_parent" ] && [ "$dev_self" != "$dev_parent" ]
}

echo "Entrypoint: Ensuring data directory..."
mkdir -p "$DATA_DIR"

# Skip recursive chown for bind-mounted projects
SKIP_PROJECTS_CHOWN=false
if [ -d "$PROJECTS_DIR" ] && is_mountpoint "$PROJECTS_DIR"; then
    echo "Entrypoint: Detected bind-mounted projects; skipping recursive chown"
    SKIP_PROJECTS_CHOWN=true
fi

chown "${PUID}:${PGID}" "$DATA_DIR" || true
chmod 775 "$DATA_DIR" || true

if [ "$SKIP_PROJECTS_CHOWN" = "true" ]; then
    for entry in "$DATA_DIR"/*; do
        [ -e "$entry" ] || continue
        [ "$entry" = "$PROJECTS_DIR" ] && continue
        chown -R "${PUID}:${PGID}" "$entry" || true
    done
else
    chown -R "${PUID}:${PGID}" "$DATA_DIR" || true
fi

# Map host projects GID for access without changing ownership
if [ -d "$PROJECTS_DIR" ]; then
    PRJ_PATH="$PROJECTS_DIR"
    CANDIDATE="$(find "$PROJECTS_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)"
    [ -n "$CANDIDATE" ] && PRJ_PATH="$CANDIDATE"
    PRJ_GID="$(stat -c '%g' "$PRJ_PATH" 2>/dev/null || echo "")"
    if [ -n "$PRJ_GID" ]; then
        if getent group "$PRJ_GID" >/dev/null 2>&1; then
            HOST_GROUP=$(getent group "$PRJ_GID" | cut -d: -f1)
        else
            HOST_GROUP="hostgid_${PRJ_GID}"
            addgroup -g "$PRJ_GID" "$HOST_GROUP"
        fi
        addgroup "$APP_USER" "$HOST_GROUP" 2>/dev/null || true
    fi
fi

echo "Entrypoint: Setup complete. Starting as ${APP_USER} (UID: ${PUID}, GID: ${PGID})"
exec su-exec "$APP_USER" "$@"
