---
sidebar_position: 2
title: Configuration
---

# Arcane Configuration

Arcane stores all settings securely and lets you manage them easily from the web UI.

## Where Settings Are Stored

- All settings are stored in `/app/data/settings/settings.dat` inside the container All the `sensitive` settings are encrypted.
- While it is possible to edit certain settings from the file directly, IT is recomended to use the Settings UI to configure all settings.

## How to Change Settings

1. Open Arcane in your browser
2. Go to **Settings**
3. Change what you need
4. Click **Save**

## Config Options

| Setting                 | Description                     | Default                       | Notes                             |
| ----------------------- | ------------------------------- | ----------------------------- | --------------------------------- |
| `dockerHost`            | Docker engine address           | `unix:///var/run/docker.sock` | Use `tcp://...` for remote Docker |
| `autoUpdate`            | Auto-update running apps        | `false`                       | -                                 |
| `autoUpdateInterval`    | Update check interval (minutes) | `60`                          | Only if autoUpdate is enabled     |
| `pollingEnabled`        | Poll Docker for status updates  | `true`                        | -                                 |
| `pollingInterval`       | Status poll interval (minutes)  | `10`                          | -                                 |
| `pruneMode`             | Image cleanup mode              | `all`                         | `dangling` = only untagged images |
| `stacksDirectory`       | Where Compose files are stored  | `/app/data/stacks`            | -                                 |
| `auth.localAuthEnabled` | Enable username/password login  | `true`                        | -                                 |
| `auth.sessionTimeout`   | Idle session timeout (minutes)  | `60`                          | -                                 |
| `auth.passwordPolicy`   | Password strength requirement   | `medium`                      | -                                 |
| `registryCredentials`   | Private registry authentication | -                             | Not fully implemented             |

## Docker Setup (Quick)

Mount a volume to keep your settings and data:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - arcane-data:/app/data
```

To import stacks, Arcane needs access to your Compose files. Add a bind mount so the path to your Compose files is the same inside and outside the container. (This mount is in addition to the normal `arcane-data` mount)

```yaml
- /host/path/to/stacks:/host/path/to/stacks:ro
```

## Environment Variables

| Variable                        | Purpose                | Default/Example | Notes               |
| ------------------------------- | ---------------------- | --------------- | ------------------- |
| `PUID`                          | File owner user ID     | `1000`          | Use your user ID    |
| `PGID`                          | File owner group ID    | `1000`          | Use your group ID   |
| `DOCKER_GID`                    | Docker group ID        | (auto)          | Only if needed      |
| `APP_ENV`                       | App environment        | `production`    | Required for Docker |
| `PUBLIC_SESSION_SECRET`         | Session secret         | (set this!)     | Use a strong value  |
| `PUBLIC_ALLOW_INSECURE_COOKIES` | Allow insecure cookies | (unset)         | For local HTTP only |

---

- Don't touch `settings.dat` directly — all changes should be made in the Arcane UI for safety.
- Back up your `arcane-data` folder regularly to avoid losing settings and stacks.
- Use HTTPS in production to protect your credentials and sessions.
