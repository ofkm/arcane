---
sidebar_position: 4
title: Requirements
---

# System Requirements

Before installing and running Arcane, please ensure your system meets the following requirements.

## Runtime Requirements

These are needed to run Arcane itself.

- **Docker Engine:**
  - Version **20.10.0** or higher is recommended.
  - Arcane needs access to the Docker daemon socket (e.g., `/var/run/docker.sock`) or a TCP endpoint.
- **Operating System:** Any operating system capable of running Docker:
  - Linux (Recommended)
  - macOS
  - Windows (with WSL2 recommended for best performance)
- **Web Browser:** A modern web browser is required to access the Arcane UI:
  - Google Chrome (latest versions)
  - Mozilla Firefox (latest versions)
  - Safari (latest versions)
  - Microsoft Edge (latest versions)
- **Hardware:**
  - **RAM:** Minimum 512MB available for the Arcane container (actual usage may be lower). More RAM may be needed depending on the number of containers managed.
  - **CPU:** 1 CPU core should be sufficient for Arcane itself.

## Installation Requirements (Recommended Method)

If you plan to use the recommended Docker Compose setup:

- **Docker Compose:** Version 1.29.0 or higher.
- **Git:** Required to clone the Arcane repository.

Meeting these requirements will ensure a smooth installation and optimal performance of Arcane.
