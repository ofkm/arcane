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
# Skip socket configuration if using TCP proxy (DOCKER_HOST with tcp://)
if [ -n "$DOCKER_HOST" ] && echo "$DOCKER_HOST" | grep -q "^tcp://"; then
    echo "Entrypoint: Docker proxy mode detected (DOCKER_HOST=${DOCKER_HOST}), skipping socket setup"
elif [ -S /var/run/docker.sock ]; then
    SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
    echo "Entrypoint: Docker socket found with GID ${SOCKET_GID}"
    if [ "$SOCKET_GID" = "0" ]; then
        echo "Entrypoint: Docker socket owned by root group (GID 0), adding ${APP_USER} to root group..."
        addgroup "$APP_USER" root
        echo "Entrypoint: Docker socket configured (using root group)"
    else
        if getent group docker >/dev/null 2>&1; then
            CURRENT_DOCKER_GID=$(getent group docker | cut -d: -f3)
            if [ "$CURRENT_DOCKER_GID" != "$SOCKET_GID" ]; then
                echo "Entrypoint: Updating docker group GID from ${CURRENT_DOCKER_GID} to ${SOCKET_GID}..."
                groupmod -g "$SOCKET_GID" docker 2>/dev/null || {
                    delgroup docker 2>/dev/null || true
                    addgroup -g "$SOCKET_GID" docker
                }
            fi
        else
            echo "Entrypoint: Creating docker group with GID ${SOCKET_GID}..."
            addgroup -g "$SOCKET_GID" docker
        fi
        if ! id -nG "$APP_USER" | grep -qw "docker"; then
            echo "Entrypoint: Adding ${APP_USER} to docker group..."
            addgroup "$APP_USER" docker
        fi
        echo "Entrypoint: Docker socket configured (GID: ${SOCKET_GID})"
    fi
else
    echo "WARNING: Docker socket not found at /var/run/docker.sock"
    if ! getent group docker >/dev/null 2>&1; then
        echo "Entrypoint: Creating docker group with default GID ${DOCKER_GID}..."
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

echo "Entrypoint: Setting up data directory..."
mkdir -p "$DATA_DIR"

# If projects dir exists and is a separate mount, do not chown it recursively.
SKIP_PROJECTS_CHOWN=false
if [ -d "$PROJECTS_DIR" ] && is_mountpoint "$PROJECTS_DIR"; then
    echo "Entrypoint: Detected bind-mounted projects at $PROJECTS_DIR; skipping recursive chown"
    SKIP_PROJECTS_CHOWN=true
fi

# Always ensure /app/data itself is owned and writable does not touch projects folder
chown "${PUID}:${PGID}" "$DATA_DIR" || true
chmod 775 "$DATA_DIR" || true

# Chown everything under /app/data except projects if skipped
if [ "$SKIP_PROJECTS_CHOWN" = "true" ]; then
    for entry in "$DATA_DIR"/*; do
        [ -e "$entry" ] || continue
        [ "$entry" = "$PROJECTS_DIR" ] && continue
        chown -R "${PUID}:${PGID}" "$entry" || true
    done
else
    chown -R "${PUID}:${PGID}" "$DATA_DIR" || true
fi

# Grant access to bind-mounted projects without changing host ownership:
# Map the container user into the host GID owning the projects dir.
if [ -d "$PROJECTS_DIR" ]; then
    # Prefer a real entry inside the mount (some mounts mask dir metadata)
    PRJ_PATH="$PROJECTS_DIR"
    CANDIDATE="$(find "$PROJECTS_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)"
    if [ -n "$CANDIDATE" ]; then
        PRJ_PATH="$CANDIDATE"
    fi
    PRJ_UID="$(stat -c '%u' "$PRJ_PATH" 2>/dev/null || echo "")"
    PRJ_GID="$(stat -c '%g' "$PRJ_PATH" 2>/dev/null || echo "")"

    echo "Entrypoint: Projects path used for GID detection: $PRJ_PATH (uid:$PRJ_UID gid:$PRJ_GID)"
    if [ -n "$PRJ_GID" ]; then
        if getent group "$PRJ_GID" >/dev/null 2>&1; then
            HOST_GROUP=$(getent group "$PRJ_GID" | cut -d: -f1)
        else
            HOST_GROUP="hostgid_${PRJ_GID}"
            echo "Entrypoint: Creating group ${HOST_GROUP} with GID ${PRJ_GID} for projects access"
            addgroup -g "$PRJ_GID" "$HOST_GROUP"
        fi
        if ! id -nG "$APP_USER" | grep -qw "$HOST_GROUP"; then
            echo "Entrypoint: Adding ${APP_USER} to ${HOST_GROUP} (GID ${PRJ_GID})"
            addgroup "$APP_USER" "$HOST_GROUP"
        fi

        # Check writability; if still not writable, warn but do not chown host files.
        if ! su-exec "$APP_USER" sh -c "test -w '$PROJECTS_DIR'"; then
            echo "WARNING: Projects directory ($PROJECTS_DIR) is not writable by ${APP_USER} even after group mapping."
            echo "WARNING: Host permissions may be too restrictive (e.g., 700). Not modifying host ownership."
        fi
    fi
fi

# Verify /app/data is writable before starting
if ! su-exec "$APP_USER" sh -lc "test -w '$DATA_DIR' && touch '$DATA_DIR/.rwtest' && rm -f '$DATA_DIR/.rwtest'"; then
    echo "ERROR: $DATA_DIR is not writable by ${APP_USER}. Check volume permissions."
    exit 1
fi

# Ensure app directory ownership
chown "${PUID}:${PGID}" /app

# Favor group-writable files created by the app
umask 002

echo "Entrypoint: Setup complete. Starting as ${APP_USER} (UID: ${PUID}, GID: ${PGID})"
exec su-exec "$APP_USER" "$@"
