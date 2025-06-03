# Agent Setup Guide

> **⚠️ Preview Feature**  
> Agents are currently in preview and subject to significant changes. APIs, configuration formats, and functionality may change between versions without notice. Use with caution in production environments, because of this documentation may not cover all options.

## Overview

Arcane agents are lightweight Go applications that run on remote servers to manage Docker containers and stacks. They communicate with your main Arcane instance via HTTP API.

## Architecture

```
┌─────────────────┐    HTTP API    ┌─────────────────┐
│  Arcane Server  │ ◄─────────────► │   Go Agent      │
│  (Management)   │                 │  (Remote Host)  │
└─────────────────┘                 └─────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Network access to Arcane server
- User with Docker socket permissions

## Quick Start with Docker

```bash
# Run the agent with Docker
docker run -d --name arcane-agent \
  -e ARCANE_HOST=your-server.com \
  -e ARCANE_PORT=3000 \
  -e AGENT_ID=my-agent \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/ofkm/arcane-agent:latest
```

## Troubleshooting

### Common Issues

**Agent not registering**: Check network connectivity to Arcane server

```bash
curl -I http://your-arcane-server:3000/api/agents/register
```

**Docker permission denied**: Ensure agent user is in docker group

```bash
sudo usermod -aG docker arcane-agent
sudo systemctl restart arcane-agent
```

## Updates

### Docker Updates

```bash
# Pull new image
docker pull ghcr.io/ofkm/arcane-agent:latest

# Stop and remove old container
docker stop arcane-agent
docker rm arcane-agent

# Start with new image
docker run -d --name arcane-agent \
  -e ARCANE_HOST=your-server.com \
  -e ARCANE_PORT=3000 \
  -e AGENT_ID=my-agent \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/ofkm/arcane-agent:latest
```

---

> **Note**: This feature is under active development. For support or to report issues, please visit our [GitHub repository](https://github.com/ofkm/arcane-agent).
