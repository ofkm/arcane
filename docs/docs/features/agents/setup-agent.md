# Agent Setup Guide

## Overview

Arcane uses a distributed agent system that allows you to manage Docker containers, stacks, and resources across multiple remote servers. Agents are lightweight Go applications that run on your target servers and communicate with the main Arcane instance.

## Architecture

```
┌─────────────────┐    HTTP API    ┌─────────────────┐
│  Arcane Server  │ ◄─────────────► │   Go Agent      │
│  (Management)   │                 │  (Remote Host)  │
└─────────────────┘                 └─────────────────┘
        │                                    │
        ▼                                    ▼
┌─────────────────┐                 ┌─────────────────┐
│   Task Queue    │                 │ Docker Engine   │
│   & Database    │                 │   & Compose     │
└─────────────────┘                 └─────────────────┘
```

## Agent Features

### Core Capabilities

- **Docker Management**: Execute Docker commands remotely
- **Stack Deployment**: Deploy and manage Docker Compose stacks
- **Image Operations**: Pull, manage, and deploy container images
- **System Monitoring**: Report system metrics and Docker info
- **Auto-Discovery**: Automatic registration with Arcane server

### Supported Operations

- `docker_command` - Execute arbitrary Docker commands
- `stack_list` - List all Docker Compose projects
- `compose_create_project` - Create new Compose projects
- `compose_up` - Start Compose stacks
- `compose_down` - Stop Compose stacks
- `compose_restart` - Restart Compose stacks
- `image_pull` - Pull Docker images
- `health_check` - Agent health verification
- `agent_upgrade` - Self-update capability

## Prerequisites

### Server Requirements

- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, etc.) or macOS
- **Docker**: Docker Engine 20.10+ installed and running
- **Docker Compose**: v2.0+ (included with modern Docker installations)
- **Network**: HTTP/HTTPS connectivity to Arcane server
- **Permissions**: Agent user must have Docker socket access

### System Resources

- **CPU**: 1 core minimum (2+ recommended)
- **Memory**: 512MB minimum (1GB+ recommended)
- **Storage**: 100MB for agent binary + space for Docker operations
- **Network**: Stable internet connection with low latency to Arcane server

## Installation

### Quick Install Script

```bash
# Download and install the latest agent
curl -fsSL https://raw.githubusercontent.com/ofkm/arcane-agent/main/install.sh | bash

# Or specify a version
curl -fsSL https://raw.githubusercontent.com/ofkm/arcane-agent/main/install.sh | bash -s v1.0.0
```

### Manual Installation

#### 1. Download Agent Binary

```bash
# Linux x64
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-linux-amd64
chmod +x arcane-agent-linux-amd64
sudo mv arcane-agent-linux-amd64 /usr/local/bin/arcane-agent

# Linux ARM64
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-linux-arm64
chmod +x arcane-agent-linux-arm64
sudo mv arcane-agent-linux-arm64 /usr/local/bin/arcane-agent

# macOS x64
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-darwin-amd64
chmod +x arcane-agent-darwin-amd64
sudo mv arcane-agent-darwin-amd64 /usr/local/bin/arcane-agent

# macOS ARM64 (Apple Silicon)
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-darwin-arm64
chmod +x arcane-agent-darwin-arm64
sudo mv arcane-agent-darwin-arm64 /usr/local/bin/arcane-agent
```

#### 2. Create Configuration

```bash
# Create config directory
sudo mkdir -p /etc/arcane-agent

# Create configuration file
sudo tee /etc/arcane-agent/config.yaml << EOF
# Arcane server configuration
server:
  url: "http://your-arcane-server:3000"
  # For HTTPS with self-signed certs
  # insecure_tls: true

# Agent identification
agent:
  id: "$(hostname)-$(date +%s)"
  hostname: "$(hostname)"

# Polling configuration
polling:
  interval: 5s
  timeout: 30s

# Docker configuration
docker:
  socket: "/var/run/docker.sock"

# Logging
logging:
  level: "info"
  format: "json"
EOF
```

#### 3. Create Service User

```bash
# Create dedicated user for the agent
sudo useradd --system --no-create-home --shell /bin/false arcane-agent

# Add to docker group for socket access
sudo usermod -aG docker arcane-agent

# Set permissions
sudo chown -R arcane-agent:arcane-agent /etc/arcane-agent
```

## Service Configuration

### Systemd Service (Linux)

```bash
# Create systemd service file
sudo tee /etc/systemd/system/arcane-agent.service << EOF
[Unit]
Description=Arcane Agent
Documentation=https://arcane.ofkm.dev
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=arcane-agent
Group=arcane-agent
ExecStart=/usr/local/bin/arcane-agent --config /etc/arcane-agent/config.yaml
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=arcane-agent

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/arcane-agent

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable arcane-agent
sudo systemctl start arcane-agent
```

### Launchd Service (macOS)

```bash
# Create launchd plist
sudo tee /Library/LaunchDaemons/dev.arcane.agent.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>dev.arcane.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/arcane-agent</string>
        <string>--config</string>
        <string>/etc/arcane-agent/config.yaml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/var/log/arcane-agent.log</string>
    <key>StandardOutPath</key>
    <string>/var/log/arcane-agent.log</string>
</dict>
</plist>
EOF

# Load and start service
sudo launchctl load /Library/LaunchDaemons/dev.arcane.agent.plist
sudo launchctl start dev.arcane.agent
```

## Configuration Reference

### Complete Configuration File

```yaml
# /etc/arcane-agent/config.yaml

# Arcane server settings
server:
  url: 'https://arcane.example.com'
  insecure_tls: false
  timeout: 30s

  # Authentication (if enabled)
  auth:
    token: 'your-agent-token'
    # or basic auth
    username: 'agent'
    password: 'password'

# Agent identification
agent:
  id: 'production-web-01'
  hostname: 'web-01.production.example.com'
  tags:
    - 'production'
    - 'web-server'
    - 'zone-east'

  # Resource limits
  max_concurrent_tasks: 5
  task_timeout: 300s

# Polling configuration
polling:
  interval: 5s
  timeout: 30s
  max_retries: 3
  backoff_multiplier: 2

# Docker configuration
docker:
  socket: '/var/run/docker.sock'
  # For remote Docker
  # host: "tcp://localhost:2376"
  # tls_cert: "/path/to/cert.pem"
  # tls_key: "/path/to/key.pem"
  # tls_ca: "/path/to/ca.pem"

  # Default settings for operations
  compose:
    project_directory: '/var/lib/arcane-agent/projects'
    default_env_file: '.env'

  # Image pull settings
  images:
    pull_timeout: 600s
    registry_auth:
      - registry: 'registry.example.com'
        username: 'robot'
        password: 'token'

# Storage and working directory
storage:
  data_dir: '/var/lib/arcane-agent'
  temp_dir: '/tmp/arcane-agent'
  cleanup_interval: '24h'
  max_log_size: '100MB'

# Logging configuration
logging:
  level: 'info' # debug, info, warn, error
  format: 'json' # json, text
  output: 'stdout' # stdout, stderr, file
  file: '/var/log/arcane-agent.log'
  rotate: true
  max_size: '10MB'
  max_backups: 5

# Metrics and monitoring
metrics:
  enabled: true
  interval: 60s

  # System metrics to collect
  collect:
    - 'docker_info'
    - 'container_stats'
    - 'system_resources'
    - 'disk_usage'

# Security settings
security:
  # Commands that are allowed/denied
  allowed_commands:
    - 'ps'
    - 'images'
    - 'pull'
    - 'run'
    - 'stop'
    - 'start'
    - 'restart'

  denied_commands:
    - 'system prune -a --force'

  # Prevent certain operations
  restrictions:
    allow_privileged: false
    allow_host_network: false
    allow_system_mounts: false
```

## Verification

### Check Agent Status

```bash
# Check service status
sudo systemctl status arcane-agent

# View logs
sudo journalctl -u arcane-agent -f

# Check agent version
arcane-agent --version
```

### Verify Docker Access

```bash
# Test Docker socket access
sudo -u arcane-agent docker ps
sudo -u arcane-agent docker version
```

### Test Connectivity

```bash
# Test connection to Arcane server
curl -I http://your-arcane-server:3000/api/agents/register

# Check agent registration
tail -f /var/log/arcane-agent.log | grep "registration"
```

## Troubleshooting

### Common Issues

#### 1. Agent Not Registering

**Symptoms**: Agent starts but doesn't appear in Arcane UI

**Solutions**:

```bash
# Check network connectivity
curl -v http://your-arcane-server:3000/api/agents/register

# Verify configuration
arcane-agent --config /etc/arcane-agent/config.yaml --validate

# Check for proxy/firewall issues
sudo netstat -tlnp | grep :3000
```

#### 2. Docker Permission Denied

**Symptoms**: "permission denied while trying to connect to Docker daemon"

**Solutions**:

```bash
# Add user to docker group
sudo usermod -aG docker arcane-agent

# Restart agent service
sudo systemctl restart arcane-agent

# Verify socket permissions
ls -la /var/run/docker.sock
```

#### 3. Task Execution Failures

**Symptoms**: Tasks stuck in "pending" or fail immediately

**Solutions**:

```bash
# Check Docker daemon status
sudo systemctl status docker

# Verify agent has required capabilities
arcane-agent --check-capabilities

# Review task logs
sudo journalctl -u arcane-agent | grep -i error
```

#### 4. High Resource Usage

**Symptoms**: Agent consuming excessive CPU/memory

**Solutions**:

```bash
# Monitor agent process
top -p $(pgrep arcane-agent)

# Reduce polling frequency
# Edit config: polling.interval: 10s

# Limit concurrent tasks
# Edit config: agent.max_concurrent_tasks: 3
```

### Log Analysis

```bash
# View recent logs
sudo journalctl -u arcane-agent -n 100

# Follow logs in real-time
sudo journalctl -u arcane-agent -f

# Filter for specific events
sudo journalctl -u arcane-agent | grep "registration\|error\|failed"

# View logs with timestamps
sudo journalctl -u arcane-agent --since "1 hour ago"
```

## Security Considerations

### Network Security

- Use HTTPS for production deployments
- Configure firewall rules to restrict agent communication
- Consider VPN or private networks for sensitive environments

### Docker Security

- Run agent with minimal required permissions
- Use non-root user where possible
- Regularly update Docker and agent versions
- Monitor for unusual container activity

### Agent Security

- Rotate agent tokens regularly
- Use strong authentication methods
- Implement network segmentation
- Regular security audits and updates

## Maintenance

### Updates

```bash
# Stop agent
sudo systemctl stop arcane-agent

# Download new version
wget https://github.com/ofkm/arcane-agent/releases/latest/download/arcane-agent-linux-amd64
chmod +x arcane-agent-linux-amd64
sudo mv arcane-agent-linux-amd64 /usr/local/bin/arcane-agent

# Start agent
sudo systemctl start arcane-agent

# Verify version
arcane-agent --version
```

### Backup and Recovery

```bash
# Backup configuration
sudo cp -r /etc/arcane-agent /backup/arcane-agent-config-$(date +%Y%m%d)

# Backup agent data
sudo cp -r /var/lib/arcane-agent /backup/arcane-agent-data-$(date +%Y%m%d)
```

### Monitoring

Set up monitoring for:

- Agent service status
- Task execution success rates
- Resource utilization
- Docker daemon health
- Network connectivity to Arcane server

## Advanced Configuration

### High Availability Setup

For production environments, consider:

- Multiple agents per environment
- Load balancing across agents
- Automated failover mechanisms
- Centralized logging and monitoring

### Custom Task Types

Agents can be extended with custom task types:

```yaml
# Custom task configuration
tasks:
  custom:
    backup_database:
      command: '/usr/local/bin/backup-script.sh'
      timeout: 1800s
      requires_sudo: true
```

For more advanced configurations and custom integrations, refer to the [Agent Development Guide](./agent-development.md).
