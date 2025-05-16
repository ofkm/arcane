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

## Example settings.dat

```json
{
	"dockerHost": "unix:///var/run/docker.sock",
	"stacksDirectory": "data/stacks",
	"autoUpdate": true,
	"autoUpdateInterval": 60,
	"pollingEnabled": true,
	"pollingInterval": 10,
	"pruneMode": "dangling",
	"maturityThresholdDays": 5,
	"onboarding": {
		"completed": true,
		"completedAt": "2025-05-11T00:25:24.435Z",
		"steps": {
			"welcome": true,
			"password": true,
			"settings": true
		}
	},
	"externalServices": {},
	"baseServerUrl": "localhost",
	"_encrypted": "ENCRYPTED_DATA_STRING"
}
```

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

| Variable                        | Purpose                            | Default/Example                                 | Notes                        |
| ------------------------------- | ---------------------------------- | ----------------------------------------------- | ---------------------------- |
| `PUID`                          | File owner user ID                 | `1000`                                          | Use your user ID             |
| `PGID`                          | File owner group ID                | `1000`                                          | Use your group ID            |
| `DOCKER_GID`                    | Docker group ID                    | (auto)                                          | Only if needed               |
| `APP_ENV`                       | App environment                    | `production`                                    | Required for Docker          |
| `PUBLIC_SESSION_SECRET`         | Session secret                     | (set this!)                                     | Use a strong value           |
| `PUBLIC_ALLOW_INSECURE_COOKIES` | Allow insecure cookies             | (unset)                                         | For local HTTP only          |
| `PUBLIC_OIDC_ENABLED`           | Enable OIDC login                  | `true`                                          | Sets OIDC Auth to be enabled |
| `OIDC_CLIENT_ID`                | Client ID from your OIDC provider  | `your_arcane_client_id_from_provider`           | NA                           |
| `OIDC_CLIENT_SECRET`            | Client Secret from provider        | `your_super_secret_client_secret_from_provider` | NA                           |
| `OIDC_REDIRECT_URI`             | Redirect URI (must match provider) | `http://localhost:3000/auth/oidc/callback`      | NA                           |
| `OIDC_AUTHORIZATION_ENDPOINT`   | Auth endpoint URL                  | `https://your-provider.com/oauth2/authorize`    | NA                           |
| `OIDC_TOKEN_ENDPOINT`           | Token endpoint URL                 | `https://your-provider.com/oauth2/token`        | NA                           |
| `OIDC_USERINFO_ENDPOINT`        | Userinfo endpoint URL              | `https://your-provider.com/oauth2/userinfo`     | NA                           |
| `OIDC_SCOPES`                   | Scopes to request                  | `openid email profile` (default)                | NA                           |

---

- Don't touch `settings.dat` directly — all changes should be made in the Arcane UI for safety.
- Back up your `arcane-data` folder regularly to avoid losing settings and stacks.
- Use HTTPS in production to protect your credentials and sessions.
