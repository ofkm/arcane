---
sidebar_position: 2
title: Manual Installation
---

# Installing Arcane

This guide will walk you through the installation of Arcane.

## Prerequisites

Before installing Arcane, ensure you have:

- Docker installed (version 20.10.0 or higher)
- Node.js (version 16 or higher)

## Installation Methods

### Using Docker

```bash
docker pull arcane/arcane:latest
docker run -d -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock arcane/arcane:latest
```

### Using NPM

```bash
npm install -g arcane-ui
arcane-ui
```

Once installed, you can access Arcane at [http://localhost:3000](http://localhost:3000).
