---
sidebar_position: 2
title: Configuration
---

# Arcane Configuration

### How to Change Settings

1. Open Arcane in your browser
2. Expand the **Settings** section in the sidebar.
3. Choose the section of settings you want to change.
4. Make you changes and Save

### Environment Variables

| Variable                      | Purpose                                       | Default/Examples                                | Notes                        |
| ----------------------------- | --------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| `PORT`                        | The port arcane should run on                 | `8080`                                          | Optional                     |
| `DEV_BACKEND_URL`             | The url of the backend for development        | `http://localhost:8080`                         | Development Only             |
| `PUID`                        | File owner user ID                            | `2000`                                          | Use your user ID             |
| `PGID`                        | File owner group ID                           | `2000`                                          | Use your group ID            |
| `DOCKER_GID`                  | Docker group ID                               | (auto)                                          | Only if needed               |
| `ENCRYPTION_KEY`              | Encrytion Key for secuire stored seitive data | `-`                                             | Required                     |
| `JWT_SECRET`                  | Session secret                                | `-`                                             | Required                     |
| `OIDC_ENABLED`                | Enable OIDC login                             | `false`                                         | Sets OIDC Auth to be enabled |
| `OIDC_CLIENT_ID`              | Client ID from your OIDC provider             | `your_arcane_client_id_from_provider`           | NA                           |
| `OIDC_CLIENT_SECRET`          | Client Secret from provider                   | `your_super_secret_client_secret_from_provider` | NA                           |
| `OIDC_REDIRECT_URI`           | Redirect URI (must match provider)            | `http://localhost:3000/auth/oidc/callback`      | NA                           |
| `OIDC_AUTHORIZATION_ENDPOINT` | Auth endpoint URL                             | `https://your-provider.com/oauth2/authorize`    | NA                           |
| `OIDC_TOKEN_ENDPOINT`         | Token endpoint URL                            | `https://your-provider.com/oauth2/token`        | NA                           |
| `OIDC_USERINFO_ENDPOINT`      | Userinfo endpoint URL                         | `https://your-provider.com/oauth2/userinfo`     | NA                           |
| `OIDC_SCOPES`                 | Scopes to request                             | `openid email profile` (default)                | NA                           |
