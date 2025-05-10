---
sidebar_position: 2
title: Configuration
---

# Configuring Arcane

Arcane is pretty smart and usually, the best way to change its settings is right in its web pages. It keeps all your settings safe and sound by encrypting them.

## Where Arcane Keeps Its Secrets (Settings)

Arcane saves its settings in a special locked box (an encrypted file called `settings.dat`). This box is usually found at `/app/data/settings` inside the Arcane container. Because it's locked up tight, you can't (and shouldn't try to) open or edit this file directly.

## Best Way to Change Settings: Use the Web UI

Seriously, the easiest and safest way is:

1.  Open Arcane in your web browser.
2.  Go to the "Settings" page.
3.  Make your changes.
4.  Hit "Save."

Done! Arcane makes sure everything is correct and keeps it secure.

## What You Can Configure (The Nitty-Gritty)

Here are some of the things you can tell Arcane to do:

- **`dockerHost`**: Where your Docker "engine" lives.
  - Usually: `"unix:///var/run/docker.sock"` (like a special phone line to Docker on the same computer)
  - If Docker is on another computer: `"tcp://192.168.1.100:2375"` (but be careful with this!)
- **`autoUpdate`**: Should Arcane automatically update your running apps when a new version comes out?
  - Default: `false` (No)
- **`autoUpdateInterval`**: If auto-update is on, how often should it check (in minutes)?
  - Default: `60` (once an hour)
- **`pollingEnabled`**: Should Arcane keep asking Docker "Hey, what's up with the apps?"
  - Default: `true` (Yes)
- **`pollingInterval`**: How often to ask (in minutes)?
  - Default: `10`
- **`pruneMode`**: When cleaning up old Docker images, how much should it throw away?
  - `"all"`: Get rid of all unused images.
  - `"dangling"`: Only get rid of images that aren't tagged (like lost socks).
  - Default: `"all"`
- **`stacksDirectory`**: Where Arcane keeps the instruction manuals (Docker Compose files) for your app collections.
  - Default: `"/app/data/stacks"`
- **`auth`**: Settings for logging into Arcane.
  - `localAuthEnabled`: Can you log in with a username/password created in Arcane? Default: `true` (Yes)
  - `sessionTimeout`: How long before Arcane logs you out if you're not doing anything? Default: `60` minutes.
  - `passwordPolicy`: How strong do passwords need to be? Default: `"medium"`
- **`registryCredentials`**: (Heads up: This bit isn't fully working in version 0.4.0) For telling Arcane how to log into private places to get app images.

## Setting Up Arcane with Docker (The Easy Way)

If you're running Arcane in a Docker container (which is super common), here's how you tell it what to do:

### 1. Give Arcane a Place to Store Its Stuff (Mounting a Volume)

This is the **most important part** for keeping your Arcane settings and app data safe. You tell Docker to give Arcane a folder on your computer to use.

```yaml
# In your docker-compose.yml file
services:
  arcane:
    # ... other settings like image name ...
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Lets Arcane talk to Docker
      - ./arcane-data:/app/data # IMPORTANT: Arcane stores everything here!
        # './arcane-data' on your computer becomes '/app/data' inside Arcane.
    # ... other settings ...
```

When you do this, any settings you change in the Arcane web UI will be saved in that `arcane-data` folder and will still be there even if you restart Arcane.

### 2. Special Instructions for Arcane (Environment Variables)

Think of these like sticky notes you give to Arcane when it starts up. Some are really important for it to work correctly in Docker.

#### Who Owns the Files? (`PUID` and `PGID`)

- **`PUID`**: This is like telling Arcane, "The person who owns the files inside your container should have User ID number X."
- **`PGID`**: And "Their group ID number should be Y."

Why care? If Arcane saves files in that `arcane-data` folder (from the `volumes` part above), you want to make sure _you_ can still access those files on your computer. Setting `PUID` and `PGID` to _your_ user's ID numbers on your computer helps avoid "permission denied" headaches.

- **How to find your IDs (on Linux/Mac):**
  - Your User ID (PUID): Open a terminal and type `id -u`
  - Your Group ID (PGID): Open a terminal and type `id -g`
- **Defaults if you don't set them:** `PUID=1000`, `PGID=1000` (common for the first user on many Linux systems).

#### Letting Arcane Talk to Docker (`DOCKER_GID`)

- **`DOCKER_GID`**: Arcane needs permission to chat with your main Docker engine. This is usually handled by making sure Arcane is part of a special "docker" group.
- **Good news!** Arcane is pretty smart. When you connect it to `/var/run/docker.sock` (like in the `volumes` example), Arcane's entrypoint script usually figures out the right Group ID for this "docker" group automatically.
- **So, you often don't need to set `DOCKER_GID` yourself.**
- If, for some strange reason, it doesn't work, you _can_ set it. Find the ID by typing `getent group docker | cut -d: -f3` or `stat -c '%g' /var/run/docker.sock` in your terminal.

#### Telling Arcane It's in "Production Mode" (`APP_ENV`)

- **`APP_ENV=production`**: **Super important for Docker!** This tells Arcane, "You're running for real now, save all your important stuff in the `/app/data` folder." If you forget this, Arcane might try to save things in temporary spots, and you'll lose your settings when it restarts.

#### Keeping Your Login Safe (`PUBLIC_SESSION_SECRET`)

- **`PUBLIC_SESSION_SECRET`**: **You MUST set this!** This is like a secret password Arcane uses to make sure nobody messes with your login session.
- **Make it strong and random!** Don't just type "password".
- **How to make one:** Open a terminal and run `openssl rand -base64 32`. Copy the crazy string it gives you.
- **Keep this secret safe!**

#### For Local Testing Only (`PUBLIC_ALLOW_INSECURE_COOKIES`)

- **`PUBLIC_ALLOW_INSECURE_COOKIES=true`**: **Warning! Only use this if you're testing Arcane on your own computer and can't use HTTPS (the secure web lock icon).**
- Normally, Arcane insists on using secure cookies. If you're just running `http://localhost:3000`, you might need to set this to `true` to log in.
- **Never use `true` if other people can access your Arcane.** It's like leaving your front door unlocked.

#### Example Sticky Notes for Arcane (`docker-compose.yml`):

```yaml
# In your docker-compose.yml file
services:
  arcane:
    # ... image, ports, volumes ...
    environment:
      # Tell Arcane it's running for real
      - APP_ENV=production # Required for Docker!

      # Who owns the files? (Change these to your computer's user/group IDs)
      - PUID=1000
      - PGID=1000

      # Letting Arcane talk to Docker (Usually figured out automatically)
      # - DOCKER_GID=998 # Only set if auto-detection fails. Replace 998 with your Docker group's GID.

      # Your secret login handshake
      - PUBLIC_SESSION_SECRET=put_your_super_long_random_secret_here # Replace this!


      # For local HTTP testing ONLY (dangerous otherwise!)
      # - PUBLIC_ALLOW_INSECURE_COOKIES=true
    # ... other settings ...
```

## Quick Reminders

- **Don't touch `settings.dat`!** Use the web UI.
- **First time you run Arcane?** It'll set itself up with some defaults.
- **Backups are your friend!** If you back up Arcane, make sure you grab that whole `arcane-data` folder.
- **HTTPS is good!** If Arcane is on a network, put it behind a web server that does HTTPS to keep things extra safe.

## Getting Started

When you first open Arcane, it will walk you through setting up the main things. You can always change them later on the Settings page.
