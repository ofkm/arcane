---
sidebar_position: 1
title: Stacks Overview
---

# Stacks Overview

## What is a Stack?

A **Stack** is a collection of services defined in a `compose.yaml` file. For example, a stack might include a web server, a database, and a cache, all running together.

---

## What Can You Do With Stacks in Arcane?

- **View Stacks:** See all your managed stacks and any external stacks detected on your Docker host.
- **Create Stacks:** Add a new stack by giving it a name and pasting your `compose.yaml` content.
- **Start/Stop Stacks:** Easily start or stop all services in a stack with one click.
- **Restart or Redeploy:** Restart a stack or redeploy it to pull the latest images for your services.
- **Update Stacks:** Change the stack’s name or update its compose file.
- **Remove Stacks:** Delete a stack and its definition from Arcane.
- **Import External Stacks:** Bring existing stacks (not yet managed by Arcane) under Arcane’s control.

---

## How to Use Stacks

### Viewing Stacks

1. Go to the **Stacks** section in the sidebar.
2. You’ll see a list of all stacks, including their names, status (running, partially running, stopped), and how many services are running.

### Creating a Stack

1. Click the **Create Stack** button.
2. Enter a name for your stack.
3. Paste or write your `compose.yaml` content.
4. Click **Create**. Arcane will save your stack and try to start it.

### Controlling a Stack

- **Start:** Click the **Start** button to launch all services in the stack.
- **Stop:** Click **Stop** to stop and remove all containers in the stack.
- **Restart:** Click **Restart** to stop and then start the stack again.
- **Redeploy:** Click **Redeploy** to pull the latest images and restart the stack.

### Updating or Removing a Stack

- To update, open the stack and click **Edit**. Change the name or compose file, then save.
- To remove, click the **Remove** button. Confirm the action to delete the stack from Arcane.

### Importing External Stacks

If Arcane detects a stack running on your Docker host that it doesn’t manage yet, you’ll see an **Import** option. Click it to bring the stack under Arcane’s management.

---

## Where Are My Stacks Stored?

Arcane saves your stack definitions (compose files and metadata) in its data directory (by default `/app/data/stacks`).  
**Tip:** To keep your stacks safe, make sure to mount this directory as a Docker volume if you’re running Arcane in a container.
