#!/bin/sh
set -e

PUID=${PUID:-2000}
PGID=${PGID:-2000}
APP_USER="arcane"
APP_GROUP="arcane"

echo "Entrypoint: Setting up user and permissions..."
echo "Entrypoint: Using PUID=${PUID}, PGID=${PGID}"

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

# Run bootstrap as root
echo "Entrypoint: Running bootstrap as root..."
./arcane bootstrap

# Run the application as arcane user
echo "Entrypoint: Starting application as ${APP_USER} (UID: ${PUID}, GID: ${PGID})"
exec su-exec "$APP_USER" ./arcane "$@"
