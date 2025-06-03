# Agent Setup Guide

> **⚠️ Preview Feature**  
> Agents are currently in preview and subject to significant changes. APIs, configuration formats, and functionality may change between versions without notice. Use with caution in production environments, because of this documentation is not fully complete.

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

- Linux or macOS
- Docker Engine 20.10+
- Network access to Arcane server
- User with Docker socket permissions

## Quick Install

```bash
# Download and install the agent
curl -fsSL https://raw.githubusercontent.com/ofkm/arcane-agent/main/install.sh | bash
```

## Manual Setup

### 1. Download Agent

```bash
# Linux x64
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-linux-amd64
chmod +x arcane-agent-linux-amd64
sudo mv arcane-agent-linux-amd64 /usr/local/bin/arcane-agent

# macOS ARM64 (Apple Silicon)
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-darwin-arm64
chmod +x arcane-agent-darwin-arm64
sudo mv arcane-agent-darwin-arm64 /usr/local/bin/arcane-agent
```

### 2. Create Configuration

```bash
sudo mkdir -p /etc/arcane-agent

sudo tee /etc/arcane-agent/config.yaml << EOF
server:
  url: "http://your-arcane-server:3000"

agent:
  id: "$(hostname)-agent"
  hostname: "$(hostname)"

docker:
  socket: "/var/run/docker.sock"

logging:
  level: "info"
EOF
```

### 3. Create System Service

```bash
# Create user
sudo useradd --system --no-create-home --shell /bin/false arcane-agent
sudo usermod -aG docker arcane-agent

# Create systemd service
sudo tee /etc/systemd/system/arcane-agent.service << EOF
[Unit]
Description=Arcane Agent
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=arcane-agent
ExecStart=/usr/local/bin/arcane-agent --config /etc/arcane-agent/config.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable arcane-agent
sudo systemctl start arcane-agent
```

## Verification

```bash
# Check service status
sudo systemctl status arcane-agent

# View logs
sudo journalctl -u arcane-agent -f

# Test Docker access
sudo -u arcane-agent docker ps
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

**Service won't start**: Check configuration syntax

```bash
arcane-agent --config /etc/arcane-agent/config.yaml --validate
```

## Configuration Options

```yaml
server:
  url: 'http://your-arcane-server:3000'
  timeout: 30s

agent:
  id: 'unique-agent-id'
  hostname: 'server.example.com'
  max_concurrent_tasks: 5

polling:
  interval: 5s
  timeout: 30s

docker:
  socket: '/var/run/docker.sock'

logging:
  level: 'info'
  format: 'json'
```

## Updates

```bash
# Stop agent
sudo systemctl stop arcane-agent

# Download new version
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-linux-amd64
sudo mv arcane-agent-linux-amd64 /usr/local/bin/arcane-agent

# Start agent
sudo systemctl start arcane-agent
```

---

> **Note**: This feature is under active development. For support or to report issues, please visit our [GitHub repository](https://github.com/ofkm/arcane).
