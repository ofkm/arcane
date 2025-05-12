---
sidebar_position: 2
title: Working with Docker Registries
---

# Working with Docker Registries

Arcane supports pulling images from both public and private Docker registries, both for individual images and as part of stacks.

## Understanding Docker Registries

A Docker registry is a repository for Docker images. The most common registry is Docker Hub (`docker.io`), but there are many others, including:

- GitHub Container Registry (`ghcr.io`)
- Google Container Registry (`gcr.io`)
- Amazon ECR (`*.dkr.ecr.*.amazonaws.com`)
- Azure Container Registry (`*.azurecr.io`)
- Self-hosted registries (like Harbor, Nexus, or Docker Registry)

## Types of Registries

### Public Registries

Public registries allow anyone to pull images without authentication. For example, `nginx:latest` can be pulled from Docker Hub without credentials.

### Private Registries

Private registries require authentication. There are two main types:

1. **Public services with private repositories** - Services like Docker Hub, GitHub Container Registry, etc. that host both public and private repositories
2. **Self-hosted private registries** - Registries you or your organization host internally

## Configuring Registry Credentials

To use private registries with Arcane, you need to configure your registry credentials:

1. Go to the **Settings** page in Arcane
2. Navigate to the **Docker** tab
3. In the **Registry Credentials** section, click **Add Registry**
4. Fill in the following information:
   - **URL**: The registry hostname (e.g., `registry.example.com`, `docker.io`, `ghcr.io`)
   - **Username**: Your username for the registry
   - **Password**: Your password or access token for the registry
5. Click **Save**

### Important Notes About Registry URLs

- For Docker Hub, use `docker.io` as the URL
- Don't include protocols (like `https://`) in the URL
- For registries with ports, include the port: `myregistry.com:5000`
- Self-hosted registries should use their hostname or IP: `registry.local` or `192.168.1.100:5000`

## Pulling Individual Images

When pulling an individual image in Arcane:

1. Click on the **Images** tab
2. Click the **Pull Image** button
3. Enter the image name and tag (e.g., `nginx:latest` or `myregistry.example.com/myapp:1.0`)
4. If the image is in a private registry:
   - For registries you've already configured, Arcane will automatically use the stored credentials
   - For a one-time pull from a registry you haven't stored, expand the **Authentication** section and enter the registry credentials

Arcane will use the appropriate authentication methods and pull the image, showing you progress in real-time.

## Pulling Images in Stacks

Arcane automatically handles authentication for images in stacks:

1. When deploying or updating a stack, Arcane scans all images in your docker-compose.yml file
2. For each image, it extracts the registry hostname (e.g., `myregistry.example.com` from `myregistry.example.com/myapp:latest`)
3. It searches your stored registry credentials for a matching registry URL
4. If matching credentials are found, they're used automatically for authentication
5. The pull proceeds without requiring any additional input

### Example of Automatic Authentication

If your docker-compose.yml contains:

```yaml
services:
  app:
    image: myregistry.example.com/myapp:latest
  database:
    image: docker.io/myusername/private-db:v1
```

Arcane will:

1. Identify that `myregistry.example.com` and `docker.io` are the registries
2. Look for matching credentials in your settings
3. Apply the correct credentials for each image pull

## How Registry Names Are Matched

Arcane uses smart matching to identify the correct registry:

1. For explicit registry hostnames (e.g., `myregistry.example.com/myapp:latest`), the hostname is extracted directly
2. For short Docker Hub references (e.g., `nginx` or `username/repo`), `docker.io` is used as the registry
3. Common aliases for the same registry are handled automatically (e.g., `docker.io`, `index.docker.io`, and `registry-1.docker.io` are all treated as equivalent)

## Troubleshooting Registry Authentication

If you encounter issues pulling from private registries:

### Common Error Messages and Solutions

| Error Message                                        | Possible Cause                         | Solution                                                                   |
| ---------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| "unauthorized: authentication required"              | Missing or incorrect credentials       | Verify your username and password in Settings                              |
| "no matching manifest for linux/arm64/v8"            | Image doesn't support your platform    | Specify platform using `?platform=linux/amd64` or build a compatible image |
| "manifest unknown"                                   | Image tag doesn't exist                | Check that the tag is correct and exists                                   |
| "denied: requested access to the resource is denied" | No permission to access the repository | Ensure your user has pull access to the repository                         |
| "error parsing HTTP 403 response body"               | Registry refusing connection           | Registry may be blocking requests; check firewall settings                 |

### General Troubleshooting Steps

1. **Check Credentials**: Ensure your username and password are correct and not expired
2. **Verify Registry URL Format**: Make sure the URL matches exactly how it appears in your image names
3. **Docker Hub Special Case**: For Docker Hub, use `docker.io` as the registry URL, even if your image is referenced as `username/image`
4. **Check Image Name Format**: Ensure your docker-compose.yml uses the full image name including the registry
5. **Platform Compatibility**: For ARM devices (like Raspberry Pi or M1/M2 Macs), make sure your private images support the correct architecture

## Registry Credential Security

Arcane keeps your registry credentials secure:

1. Credentials are encrypted at rest in the settings.dat file
2. Credentials are only decrypted in memory when needed for pull operations
3. Credentials are never exposed in logs or UI outside of the settings page

If you need to revoke access, simply update or remove the credentials in the Arcane Settings page.

## Using Access Tokens Instead of Passwords

Many registries support access tokens with limited permissions as an alternative to passwords:

1. **Docker Hub**: Create a [personal access token](https://docs.docker.com/docker-hub/access-tokens/) with read-only scope
2. **GitHub Container Registry**: Create a [personal access token](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-to-the-container-registry) with `read:packages` scope
3. **GitLab Container Registry**: Create a [personal access token](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html) with `read_registry` scope

Using tokens with limited scope is recommended for better security.
