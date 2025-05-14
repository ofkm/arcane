---
sidebar_position: 3
title: OIDC Authentication
---

:::info
Introduced in version 0.9.0
:::

# Setting Up OIDC Authentication

Arcane can integrate with an OpenID Connect (OIDC) provider to let users log in with their existing accounts from services like Google, Okta, Keycloak, or other compatible identity providers. This guide explains how to configure it.

## What is OIDC?

OIDC is a standard way for applications (like Arcane) to verify a user's identity using an external Identity Provider (IdP) without needing to handle passwords directly. It's a secure and common method for single sign-on (SSO).

## Before You Start

You'll need to have an OIDC provider set up and have registered Arcane as a client application with that provider. Your OIDC provider will give you several key pieces of information that Arcane needs:

- **Client ID**: A unique identifier for Arcane within your OIDC provider.
- **Client Secret**: A secret password that Arcane uses to authenticate itself to the OIDC provider. Keep this secure!
- **Authorization Endpoint URL**: The URL where users will be redirected to log in.
- **Token Endpoint URL**: The URL Arcane uses to exchange an authorization code for an access token.
- **Userinfo Endpoint URL**: The URL Arcane uses to get information about the logged-in user.
- **Scopes**: Defines what information Arcane can request about the user (e.g., `openid email profile`).

You will also need to configure a **Redirect URI** (also known as a Callback URL) in your OIDC provider. This is the URL where the provider will send the user back to Arcane after they log in. For Arcane, this is typically:
`http://your-arcane-address/auth/oidc/callback`
(e.g., `http://localhost:3000/auth/oidc/callback` or `https://arcane.example.com/auth/oidc/callback`)

## Configuring Arcane for OIDC

Arcane offers two primary ways to configure OIDC:

1.  **Environment Variables (Recommended for Docker/Production):** This is the most common method when running Arcane in a containerized environment. Settings provided via environment variables take precedence.
2.  **Application UI (Settings Page):** If environment variables for OIDC are not set, you can configure OIDC directly through the Arcane web interface. These settings are stored securely in Arcane's data directory.

### Method 1: Environment Variables

These are the "sticky notes" you give to Arcane when it starts up to tell it about your OIDC provider. If these are set, they will generally override any OIDC settings configured via the UI.

- **`PUBLIC_OIDC_ENABLED`**: Set this to `true` to enable OIDC login. If set to `true` and other OIDC environment variables are missing, Arcane will prompt for configuration via the UI on first setup or if settings are incomplete.
  - Example: `PUBLIC_OIDC_ENABLED=true`
- **`OIDC_CLIENT_ID`**: The Client ID from your OIDC provider.
  - Example: `OIDC_CLIENT_ID="your_arcane_client_id_from_provider"`
- **`OIDC_CLIENT_SECRET`**: The Client Secret from your OIDC provider.
  - Example: `OIDC_CLIENT_SECRET="your_super_secret_client_secret_from_provider"`
- **`OIDC_REDIRECT_URI`**: The exact Redirect URI you configured in your OIDC provider for Arcane.
  - Example: `OIDC_REDIRECT_URI="http://localhost:3000/auth/oidc/callback"`
- **`OIDC_AUTHORIZATION_ENDPOINT`**: The Authorization Endpoint URL from your OIDC provider.
  - Example: `OIDC_AUTHORIZATION_ENDPOINT="https://your-provider.com/oauth2/authorize"`
- **`OIDC_TOKEN_ENDPOINT`**: The Token Endpoint URL from your OIDC provider.
  - Example: `OIDC_TOKEN_ENDPOINT="https://your-provider.com/oauth2/token"`
- **`OIDC_USERINFO_ENDPOINT`**: The Userinfo Endpoint URL from your OIDC provider.
  - Example: `OIDC_USERINFO_ENDPOINT="https://your-provider.com/oauth2/userinfo"`
- **`OIDC_SCOPES`**: The scopes Arcane should request. This is a space-separated list.
  - Default: `"openid email profile"`
  - Example: `OIDC_SCOPES="openid email profile groups"`

### Example `docker-compose.yml` Snippet

Here's how you might add these to your `docker-compose.yml` file:

```yaml
# In your docker-compose.yml file
services:
  arcane:
    # ... image, ports, volumes ...
    environment:
      # --- Standard Arcane Variables ---
      - APP_ENV=production
      - PUID=1000
      - PGID=1000
      - PUBLIC_SESSION_SECRET=your_super_long_random_secret_here

      # --- OIDC Configuration ---
      - PUBLIC_OIDC_ENABLED=true
      - OIDC_CLIENT_ID="your_arcane_client_id_from_provider"
      - OIDC_CLIENT_SECRET="your_super_secret_client_secret_from_provider"
      - OIDC_REDIRECT_URI="http://your-arcane-address/auth/oidc/callback" # IMPORTANT: Match your provider!
      - OIDC_AUTHORIZATION_ENDPOINT="https://your-provider.com/oauth2/authorize"
      - OIDC_TOKEN_ENDPOINT="https://your-provider.com/oauth2/token"
      - OIDC_USERINFO_ENDPOINT="https://your-provider.com/oauth2/userinfo"
      - OIDC_SCOPES="openid email profile" # Adjust as needed
    # ... other settings ...
```

### Method 2: Application UI

If you prefer not to use environment variables for all OIDC settings, or if `PUBLIC_OIDC_ENABLED` is set to `true` but other OIDC environment variables are missing, you can configure (or complete the configuration for) OIDC through Arcane's settings page.

1.  Ensure Arcane is running.
2.  Open the Arcane web UI and navigate to **Settings** -> **Authentication**.
3.  Locate the "OIDC Authentication" section.
4.  If OIDC is not forced on by `PUBLIC_OIDC_ENABLED`, you can enable it using the switch.
5.  If OIDC is enabled (either by the switch or forced by environment variables) but not fully configured (either via environment variables or previous UI settings), you will be prompted or can click a button (e.g., "Configure OIDC" or "Manage Them") to open a dialog.
6.  In the dialog, you can enter:
    - Client ID
    - Client Secret (this will be stored encrypted)
    - Redirect URI
    - Authorization Endpoint URL
    - Token Endpoint URL
    - Userinfo Endpoint URL
    - Scopes
7.  Save the configuration. These settings will be stored securely by Arcane.

**Note on Precedence:**

- If `PUBLIC_OIDC_ENABLED=true` is set as an environment variable, OIDC will be active.
- Specific OIDC parameters (like Client ID, Client Secret, etc.) set via environment variables will always take precedence over those set in the UI.
- If a specific OIDC environment variable (e.g., `OIDC_CLIENT_ID`) is _not_ set, Arcane will then look for the corresponding value configured via the UI (if OIDC is enabled).

## Enabling and Verifying

Once OIDC is configured (either via environment variables, the UI, or a combination):

1.  Go to the Arcane web UI.
2.  Navigate to **Settings** -> **Authentication**.
3.  The "OIDC Authentication" section will show the status.
    - If configured via environment variables, it will indicate this, and you can view the (non-secret) values.
    - If configured via the UI, you can manage the settings there.
4.  Ensure the OIDC toggle switch is enabled (if not forced on by `PUBLIC_OIDC_ENABLED`).

After successful configuration and enablement, you should see an option to "Login with OIDC" (or similar) on the Arcane login page.

## Troubleshooting

- **Double-check Redirect URI:** The most common issue is a mismatch between the `OIDC_REDIRECT_URI` in Arcane's environment variables and the Redirect URI configured in your OIDC provider. They must match exactly.
- **Provider Logs:** Check the logs from your OIDC provider for any error messages if login fails.
- **Arcane Logs:** Check Arcane's container logs for any OIDC-related errors.
- **Client Secret:** Ensure the `OIDC_CLIENT_SECRET` is correct and hasn't been accidentally changed or had special characters misinterpreted by your shell or Docker Compose file (quoting can help).
