---
sidebar_position: 2
title: User Management & SSO
---

# User Management & Single Sign-On (OIDC)

Arcane supports both local user management and Single Sign-On (OIDC) for flexible, secure access control.

## Local User Management

- On first run, Arcane creates a default admin user if no users exist.
  - **Username:** `arcane`
  - **Password:** `arcane-admin`
  - You must change this password during onboarding.
- To add users: Go to **Settings → User Management** and click **Create User**. Fill in username, display name, email, and password.

## Single Sign-On (OIDC)

:::info
Introduced in version 0.9.0
:::

### Recommended: Configure OIDC in the UI

:::important
Arcane requires the use of PKCE for OIDC Authentication
:::

- Go to **Settings → Authentication** in Arcane.
- Enter your OIDC provider details (Issuer URL, Client ID, Client Secret, Redirect URI, etc).
- Save and test the connection.
- The UI will guide you through any missing or invalid fields.

OIDC users are auto-provisioned on first login. You can disable local login for stricter security.

### Alternative: Environment Variables

You can also configure OIDC using environment variables:

| Variable                      | Description                        | Default/Example                                 |
| ----------------------------- | ---------------------------------- | ----------------------------------------------- |
| `OIDC_ENABLED`                | Enable OIDC login                  | `false`                                         |
| `OIDC_CLIENT_ID`              | Client ID from your OIDC provider  | `your_arcane_client_id_from_provider`           |
| `OIDC_CLIENT_SECRET`          | Client Secret from provider        | `your_super_secret_client_secret_from_provider` |
| `OIDC_REDIRECT_URI`           | Redirect URI (must match provider) | `http://localhost:3000/auth/oidc/callback`      |
| `OIDC_AUTHORIZATION_ENDPOINT` | Auth endpoint URL                  | `https://your-provider.com/oauth2/authorize`    |
| `OIDC_TOKEN_ENDPOINT`         | Token endpoint URL                 | `https://your-provider.com/oauth2/token`        |
| `OIDC_USERINFO_ENDPOINT`      | Userinfo endpoint URL              | `https://your-provider.com/oauth2/userinfo`     |
| `OIDC_SCOPES`                 | Scopes to request                  | `openid email profile` (default)                |

#### Example docker-compose

```yaml
services:
  arcane:
    # ... image, ports, volumes ...
    environment:
      # ....
      - OIDC_ENABLED=true
      - OIDC_CLIENT_ID=your_arcane_client_id_from_provider
      - OIDC_CLIENT_SECRET=your_super_secret_client_secret_from_provider
      - OIDC_REDIRECT_URI=http://your-arcane-address/auth/oidc/callback
      - OIDC_AUTHORIZATION_ENDPOINT=https://your-provider.com/oauth2/authorize
      - OIDC_TOKEN_ENDPOINT=https://your-provider.com/oauth2/token
      - OIDC_USERINFO_ENDPOINT=https://your-provider.com/oauth2/userinfo
      - OIDC_SCOPES=openid email profile
```

**Note:** Env vars always override UI settings. The Redirect URI in Arcane and your OIDC provider must match exactly.

---

For troubleshooting, check both your OIDC provider and Arcane logs for errors.
