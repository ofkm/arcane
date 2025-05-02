---
sidebar_position: 1
title: Troubleshooting
---

# Troubleshooting

If you run into problems using Arcane, try these simple steps to get back on track.

## Docker Connection Issues

- **Is Docker running?**

  - Make sure Docker is started on your computer. You can check by running `docker ps` in your terminal.

- **Permission errors or can't connect to Docker?**
  1. Find your Docker group GID:
     - Linux: `getent group docker | cut -d: -f3`
     - macOS: `dscl . -read /Groups/docker PrimaryGroupID | awk '{print $2}'`
  2. Set the `DOCKER_GID` environment variable in your `docker-compose.yml` to match the GID you found.
     ```yaml
     environment:
       - DOCKER_GID=998 # Replace 998 with your actual GID
     ```
  3. Restart Arcane after making changes:
     ```bash
     docker-compose down && docker-compose up -d
     ```

## Web Interface Not Loading

- Make sure the Arcane container is running:
  ```bash
  docker ps | grep arcane
  ```
- Check the logs for errors:
  ```bash
  docker logs arcane
  ```
- Make sure you are visiting the correct port (default is http://localhost:3000).

## Can't Start, Stop, or Remove Containers

- Make sure you have the right permissions (see above).
- Try stopping or removing the container directly with Docker CLI to see if the problem is with Docker or Arcane.
- You can only remove stopped containers (unless you use force remove).

## Can't Pull or Remove Images

- Check your internet connection if pulling images fails.
- Make sure the image is not in use by a running container before removing it.
- Try pulling or removing the image with Docker CLI to see if the issue is with Docker or Arcane.

## Still Stuck?

- Check the Arcane logs for more details:
  ```bash
  docker logs arcane --tail 100
  ```
- Restart the Arcane container:
  ```bash
  docker restart arcane
  ```
- If you still have trouble, open an issue on GitHub with details about your problem.
