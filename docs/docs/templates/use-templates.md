# Using Templates

Templates help you quickly deploy common applications and services with Docker Compose. Arcane supports both local templates and remote registries.

## Quick Start

1. **Create a new stack** → Click "New Stack"
2. **Choose a template** → Click "Choose Template" button
3. **Select your template** → Browse local or remote templates
4. **Configure and deploy** → Customize settings and create your stack

## Template Types

### Local Templates

- Stored on your system in `data/templates/compose/`
- Always available, even offline
- Perfect for custom or frequently used configurations

### Remote Templates

- Downloaded from online registries
- Community-maintained and regularly updated
- Can be used immediately or downloaded for offline use

## Using the Template Dialog

When you click "Choose Template", you'll see:

- **Local Templates**: Ready to use immediately
- **Remote Templates**: Two options for each:
  - **Use Now**: Load template content directly into your stack
  - **Download**: Save template locally for future offline use

Templates with environment files will show an "ENV" badge and include pre-configured variables.

## Adding Local Templates

1. Navigate to `data/templates/compose/` in your Arcane directory
2. Add your Docker Compose files (`.yaml` or `.yml`)
3. Optionally add matching `.env` files for environment variables
4. Templates appear automatically in the template dialog

### Example Structure

```
data/templates/compose/
├── wordpress.yaml
├── wordpress.env
├── nextcloud.yaml
└── postgres.yaml
```

## Community Registry

Don't want to create your own? Use our community registry with pre-built templates:

**Registry URL:** `https://templates.arcane.ofkm.dev`

Add this in **Settings → Templates → Add Registry** to get started instantly with popular applications.

## Template Format

Templates use standard Docker Compose format:

```yaml
# WordPress with MySQL
version: '3.8'

services:
  wordpress:
    image: wordpress:latest
    ports:
      - '${WP_PORT:-8080}:80'
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: ${DB_USER}
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
```

## Environment Variables

Create matching `.env` files for default values:

```bash
# wordpress.env
DB_USER=wordpress
DB_PASSWORD=secure_password_here
DB_ROOT_PASSWORD=root_password_here
WP_PORT=8080
```

## Tips

- Use environment variables for configurable values
- Add comments to describe what the template does
- Include health checks for production services
- Use specific image tags instead of `latest` for stability
- Test templates before sharing with others

Need help? Check out our [community registry examples](https://github.com/ofkm/arcane-templates) for inspiration!
