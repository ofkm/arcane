# Notification System

This document describes how to configure and use the notification system in Arcane to receive alerts when container image updates are detected.

## Overview

Arcane can send notifications when it detects that container images have updates available. The notification system supports multiple providers:

- **Discord** - Send notifications to Discord channels via webhooks
- **Email** - Send notifications via SMTP email

## Configuration

### Discord Notifications

1. Navigate to **Settings → Notifications** in the Arcane UI
2. Enable **Discord Notifications**
3. Configure the following settings:
   - **Webhook URL**: Create a webhook in your Discord server settings and paste the URL here
   - **Bot Username** (optional): The display name for the notification bot (default: "Arcane")
   - **Avatar URL** (optional): A URL to an image to use as the bot's avatar
4. Click **Save Discord Settings**
5. Click **Test Discord** to verify the configuration

#### Creating a Discord Webhook

1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Configure the webhook (name, channel, avatar)
5. Copy the Webhook URL
6. Paste it into Arcane's Discord settings

### Email Notifications

1. Navigate to **Settings → Notifications** in the Arcane UI
2. Enable **Email Notifications**
3. Configure the following settings:
   - **SMTP Host**: Your SMTP server hostname (e.g., `smtp.gmail.com`)
   - **SMTP Port**: SMTP port (usually 587 for TLS or 465 for SSL)
   - **SMTP Username**: Authentication username for the SMTP server
   - **SMTP Password**: Authentication password for the SMTP server
   - **From Address**: Email address to send notifications from
   - **To Addresses**: Comma-separated list of email addresses to receive notifications
   - **Use TLS**: Enable TLS/SSL encryption (recommended)
4. Click **Save Email Settings**
5. Click **Test Email** to verify the configuration

#### Common SMTP Settings

**Gmail**
- SMTP Host: `smtp.gmail.com`
- SMTP Port: `587`
- Use TLS: Yes
- Note: You may need to use an App Password instead of your regular password

**Outlook/Office 365**
- SMTP Host: `smtp.office365.com`
- SMTP Port: `587`
- Use TLS: Yes

**Custom SMTP Server**
- Consult your email provider's documentation for SMTP settings

## How It Works

1. **Image Polling**: Arcane periodically checks for image updates based on your polling settings (Settings → Docker)
2. **Update Detection**: When an update is detected, Arcane compares the remote image digest with the local image
3. **Notification Trigger**: If an update is available, Arcane sends notifications to all enabled providers
4. **Notification Content**: Notifications include:
   - Image name and tag
   - Whether an update is available
   - Current and latest image digests
   - Timestamp of the check

## Security

- Webhook URLs and SMTP passwords are encrypted before being stored in the database
- All sensitive configuration is handled server-side
- Test notifications help verify configuration without exposing credentials

## Troubleshooting

### Discord Notifications Not Working

- Verify the webhook URL is correct and hasn't been deleted
- Check that the webhook has permission to post in the target channel
- Ensure Arcane can reach discord.com (check firewall/proxy settings)
- Review notification logs in the Arcane database

### Email Notifications Not Working

- Verify SMTP credentials are correct
- Check SMTP host and port settings
- Ensure TLS is enabled if required by your provider
- Check that Arcane can reach your SMTP server (firewall/network)
- Some providers (like Gmail) require app-specific passwords
- Review notification logs in the Arcane database

### General Issues

- Check the browser console for frontend errors
- Review Arcane server logs for backend errors
- Use the test notification buttons to isolate configuration issues
- Verify image polling is enabled (Settings → Docker)

## API Reference

The notification system exposes the following API endpoints:

### Get All Notification Settings
```
GET /api/environments/0/notifications/settings
```

### Get Settings for a Specific Provider
```
GET /api/environments/0/notifications/settings/{provider}
```

### Create or Update Settings
```
POST /api/environments/0/notifications/settings
Content-Type: application/json

{
  "provider": "discord",
  "enabled": true,
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/...",
    "username": "Arcane",
    "avatarUrl": ""
  }
}
```

### Delete Settings
```
DELETE /api/environments/0/notifications/settings/{provider}
```

### Test Notification
```
POST /api/environments/0/notifications/test/{provider}
```

## Future Enhancements

Potential future notification providers:
- Slack
- Microsoft Teams
- Telegram
- Pushover
- Apprise (supports 90+ notification services)
- Custom webhooks

If you'd like to see support for additional notification providers, please open an issue on GitHub.
