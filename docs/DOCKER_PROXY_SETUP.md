# Docker Socket Proxy Setup Guide

This guide explains how to configure Arcane to use a Docker socket proxy for enhanced security.

## Overview

By default, Arcane requires direct access to the Docker socket (`/var/run/docker.sock`), which grants near-complete control over the Docker daemon and the host system. Using a Docker socket proxy provides:

- **Reduced attack surface**: No direct socket access required
- **Fine-grained permissions**: Control which Docker API endpoints are accessible
- **Enhanced security**: Limit the potential damage from container escapes

## Quick Start

### Using docker-compose.proxy.yml

The easiest way to set up Arcane with a socket proxy is to use the provided example configuration:

```bash
# Download the example configuration
curl -O https://raw.githubusercontent.com/ofkm/arcane/main/docker-compose.proxy.yml

# Edit the file to update secrets
nano docker-compose.proxy.yml

# Start the services
docker-compose -f docker-compose.proxy.yml up -d
```

### Manual Setup

#### 1. Create a Docker Socket Proxy

First, start a Docker socket proxy service. We recommend [tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy):

```yaml
services:
  docker-socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    container_name: arcane-docker-proxy
    environment:
      # Enable required Docker API endpoints
      - CONTAINERS=1
      - IMAGES=1
      - NETWORKS=1
      - VOLUMES=1
      - INFO=1
      - SERVICES=1
      - TASKS=1
      - POST=1      # Required for creating resources
      - DELETE=1    # Required for deleting resources
      - EXEC=1      # Required for container terminal
      - SYSTEM=1    # Required for system info
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - arcane-internal
    restart: unless-stopped
```

#### 2. Configure Arcane

Update your Arcane service to use the proxy instead of the direct socket:

```yaml
services:
  arcane:
    image: ghcr.io/ofkm/arcane:latest
    environment:
      - DOCKER_HOST=tcp://docker-socket-proxy:2375
    # Note: No need to mount /var/run/docker.sock
    networks:
      - arcane-internal
    depends_on:
      - docker-socket-proxy
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_HOST` | `unix:///var/run/docker.sock` | Docker daemon socket or proxy URL |

### Supported Formats

- **Unix socket**: `unix:///var/run/docker.sock` (default)
- **TCP proxy**: `tcp://hostname:2375`
- **TCP with TLS**: `tcp://hostname:2376` (ensure proper TLS configuration)

## Socket Proxy Permissions

The following Docker API permissions are required for Arcane to function properly:

### Required for Read Operations
- `CONTAINERS=1` - List and inspect containers
- `IMAGES=1` - List and inspect images
- `NETWORKS=1` - List and inspect networks
- `VOLUMES=1` - List and inspect volumes
- `INFO=1` - Get Docker daemon information
- `SYSTEM=1` - Get system information

### Required for Write Operations
- `POST=1` - Create containers, images, networks, volumes
- `DELETE=1` - Remove containers, images, networks, volumes
- `EXEC=1` - Execute commands in containers (terminal feature)

### Optional Permissions
- `BUILD=1` - Build images (if you need build functionality)
- `SERVICES=1` - Manage Docker services
- `TASKS=1` - Manage Docker tasks

### Not Required
- `COMMIT=0` - Commit containers to images
- `CONFIGS=0` - Manage Docker configs
- `DISTRIBUTION=0` - Manage image distribution
- `GRPC=0` - gRPC API access
- `NODES=0` - Manage Docker Swarm nodes
- `PLUGINS=0` - Manage Docker plugins
- `SECRETS=0` - Manage Docker secrets
- `SESSION=0` - Session management
- `SWARM=0` - Docker Swarm management

## Security Best Practices

1. **Use read-only socket mount**: Mount the Docker socket as read-only in the proxy container:
   ```yaml
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock:ro
   ```

2. **Network isolation**: Use a dedicated internal network for Arcane and the proxy:
   ```yaml
   networks:
     arcane-internal:
       driver: bridge
   ```

3. **Minimal permissions**: Only enable the API endpoints you need in the proxy configuration.

4. **No new privileges**: Add security options to the proxy container:
   ```yaml
   security_opt:
     - no-new-privileges:true
   ```

5. **Generate strong secrets**: Use cryptographically secure values for `ENCRYPTION_KEY` and `JWT_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

## Troubleshooting

### Connection Refused

If Arcane cannot connect to the Docker proxy:

1. Verify the proxy is running: `docker ps | grep docker-proxy`
2. Check the network configuration: both services must be on the same network
3. Verify the `DOCKER_HOST` URL is correct
4. Check proxy logs: `docker logs arcane-docker-proxy`

### Permission Denied

If you get permission errors:

1. Ensure the proxy has the required API endpoints enabled
2. Check that `POST=1` and `DELETE=1` are enabled for write operations
3. Verify `EXEC=1` is enabled if using the terminal feature

### Container Cannot Start

If containers fail to start through Arcane:

1. Check that `CONTAINERS=1` and `POST=1` are enabled
2. Verify network connectivity between Arcane and the proxy
3. Review Arcane logs for detailed error messages

## Migration from Direct Socket Access

To migrate from direct socket access to a proxy:

1. **Backup your data**: Ensure your Arcane data volume is backed up
2. **Update docker-compose**: Add the proxy service and update `DOCKER_HOST`
3. **Remove socket mount**: Remove the `/var/run/docker.sock` volume mount from Arcane
4. **Restart services**: `docker-compose down && docker-compose up -d`
5. **Verify functionality**: Test that Arcane can still manage containers

## Alternative Socket Proxies

While we recommend `tecnativa/docker-socket-proxy`, other compatible proxies include:

- [linuxserver/socket-proxy](https://github.com/linuxserver/docker-socket-proxy)
- Custom HAProxy or nginx configurations with Docker socket proxying

Ensure any alternative proxy supports the required Docker API endpoints and authentication mechanisms.

## References

- [Docker Socket Proxy (Tecnativa)](https://github.com/Tecnativa/docker-socket-proxy)
- [Docker Engine API](https://docs.docker.com/engine/api/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
