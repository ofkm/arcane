# Agent Setup Guide

> **⚠️ Preview Feature**  
> Agents are currently in preview and subject to significant changes. APIs, configuration formats, and functionality may change between versions without notice. Use with caution in production environments, because of this documentation may not cover all options.

## Overview

Arcane agents are lightweight Go applications that run on remote servers to manage Docker containers and stacks. They communicate with your main Arcane instance via HTTP API.

## Architecture

```
┌─────────────────┐    HTTP API     ┌─────────────────┐
│  Arcane Server  │ ◄────────────── │    Go Agent     │
│  (Management)   │                 │  (Remote Host)  │
└─────────────────┘                 └─────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Network access to Arcane server
- User with Docker socket permissions

## Configuration

The agent supports the following environment variables:

| Environment Variable | Default Value                 | Description                               |
| -------------------- | ----------------------------- | ----------------------------------------- |
| `ARCANE_HOST`        | `localhost`                   | Hostname of the Arcane server             |
| `ARCANE_PORT`        | `3000`                        | Port of the Arcane server                 |
| `TLS_ENABLED`        | `false`                       | Enable TLS/HTTPS for server communication |
| `RECONNECT_DELAY`    | `5s`                          | Delay between reconnection attempts       |
| `HEARTBEAT_RATE`     | `30s`                         | Interval for sending heartbeat to server  |
| `COMPOSE_BASE_PATH`  | `data/agent/compose-projects` | Base directory for compose projects       |

### Configuration File

Create a `.env` file for the agent:

```bash
# .env file example
ARCANE_HOST=your-server.com
ARCANE_PORT=3000
TLS_ENABLED=false
RECONNECT_DELAY=5s
HEARTBEAT_RATE=30s
COMPOSE_BASE_PATH=/opt/agent/compose-projects
```

## Quick Start with Docker

```bash
# Run the agent with Docker
docker run -d --name arcane-agent \
  -e ARCANE_HOST=your-server.com \
  -e ARCANE_PORT=3000 \
  -e TLS_ENABLED=false \
  -e HEARTBEAT_RATE=30s \
  -e COMPOSE_BASE_PATH=/data/compose-projects \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/compose-projects:/data/compose-projects \
  ghcr.io/ofkm/arcane-agent:latest
```

## Installation Options

### Docker Compose

```yaml
services:
  arcane-agent:
    image: ghcr.io/ofkm/arcane-agent:latest
    container_name: arcane-agent
    restart: unless-stopped
    environment:
      - ARCANE_HOST=your-server.com
      - ARCANE_PORT=3000
      - TLS_ENABLED=false
      - HEARTBEAT_RATE=30s
      - RECONNECT_DELAY=5s
      - COMPOSE_BASE_PATH=/data/compose-projects
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./compose-projects:/data/compose-projects
```

### Binary Installation

```bash
# Download the binary
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-linux-amd64

# Make executable
chmod +x arcane-agent-linux-amd64

# Create configuration
cat > .env << EOF
ARCANE_HOST=your-server.com
ARCANE_PORT=3000
TLS_ENABLED=false
HEARTBEAT_RATE=30s
COMPOSE_BASE_PATH=/opt/agent/compose-projects
EOF

# Run the agent
./arcane-agent-linux-amd64
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

**TLS Certificate Issues**: When using `TLS_ENABLED=true`, ensure valid certificates

```bash
# Test TLS connection
curl -I https://your-arcane-server:3000/api/agents/register
```

## Updates

### Docker Updates

```bash
# Pull new image
docker pull ghcr.io/ofkm/arcane-agent:latest

# Stop and remove old container
docker stop arcane-agent
docker rm arcane-agent

# Start with new image (using same configuration)
docker run -d --name arcane-agent \
  --env-file .env \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/compose-projects:/data/compose-projects \
  ghcr.io/ofkm/arcane-agent:latest
```

---

> **Note**: This feature is under active development. For support or to report issues, please visit our [GitHub repository](https://github.com/ofkm/arcane-agent).
