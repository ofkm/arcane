# Creating a Custom Template Registry

Want to share templates with your team or the community? Create your own template registry!

## Overview

A template registry is simply a JSON file hosted online that describes available templates and where to find them.

## Quick Setup

### 1. Create Registry Structure

Create a JSON manifest file that lists your templates:

```json
{
	"name": "My Company Templates",
	"description": "Docker templates for internal applications",
	"version": "1.0.0",
	"author": "Your Team",
	"url": "https://github.com/yourcompany/docker-templates",
	"templates": [
		{
			"id": "internal-app",
			"name": "Internal Application",
			"description": "Company application stack with database",
			"version": "1.0.0",
			"author": "DevOps Team",
			"compose_url": "https://raw.githubusercontent.com/yourcompany/docker-templates/main/internal-app/docker-compose.yml",
			"env_url": "https://raw.githubusercontent.com/yourcompany/docker-templates/main/internal-app/.env.example",
			"documentation_url": "https://github.com/yourcompany/docker-templates/tree/main/internal-app",
			"tags": ["internal", "webapp", "postgres"],
			"updated_at": "2024-12-01T10:00:00Z"
		}
	]
}
```

### 2. Host Your Files

**Option A: GitHub (Recommended)**

1. Create a GitHub repository
2. Add your registry.json file
3. Add template directories with docker-compose.yml files
4. Use raw GitHub URLs for file access

**Option B: Web Server**

- Host registry.json on any web server
- Ensure HTTPS access
- Enable CORS if needed

### 3. Template File Structure

For each template, create a directory with:

```
your-template/
├── docker-compose.yml    # Required: Main compose file
├── .env.example         # Optional: Environment variables
└── README.md           # Optional: Documentation
```

## Registry JSON Reference

### Required Fields

- `name`: Registry display name
- `description`: Brief description
- `version`: Registry version
- `templates`: Array of template objects

### Template Object Fields

**Required:**

- `id`: Unique identifier (alphanumeric, hyphens, underscores)
- `name`: Display name
- `description`: What the template does
- `compose_url`: Direct URL to docker-compose.yml file
- `version`: Template version
- `updated_at`: ISO 8601 timestamp

**Optional:**

- `author`: Template creator
- `tags`: Array of keywords
- `env_url`: URL to .env example file
- `documentation_url`: Link to docs
- `icon_url`: Template icon

## Example Repository Structure

```
docker-templates/
├── registry.json
├── wordpress/
│   ├── docker-compose.yml
│   ├── .env.example
│   └── README.md
├── nextcloud/
│   ├── docker-compose.yml
│   ├── .env.example
│   └── README.md
└── nginx-proxy/
    ├── docker-compose.yml
    └── README.md
```

## Testing Your Registry

1. **Validate JSON**: Use a JSON validator to check syntax
2. **Test URLs**: Ensure all file URLs are accessible
3. **Add to Arcane**: Settings → Templates → Add Registry
4. **Verify**: Check that templates appear and can be downloaded

## Best Practices

### Template Quality

- Use specific image tags (not `latest`)
- Include health checks
- Add restart policies
- Document required environment variables
- Test templates before publishing

### Registry Management

- Version your templates and registry
- Keep documentation current
- Use semantic versioning
- Regular updates and maintenance
- Monitor for security updates

### Security

- Use HTTPS for all URLs
- Validate environment variable examples
- Don't include sensitive data in examples
- Consider image security scanning

## GitHub Example

Here's a minimal GitHub setup:

1. **Create repository**: `my-docker-templates`
2. **Add registry.json**:
   ```json
   {
     "name": "My Templates",
     "description": "Custom Docker templates",
     "version": "1.0.0",
     "templates": [...]
   }
   ```
3. **Registry URL**: `https://raw.githubusercontent.com/username/my-docker-templates/main/registry.json`

## Community Registry

Don't want to maintain your own? Contribute to our community registry:

**GitHub**: [https://github.com/ofkm/arcane-templates](https://github.com/ofkm/arcane-templates)

Submit pull requests to add your templates to the community collection!

## Troubleshooting

**Registry not loading?**

- Check JSON syntax
- Verify URL accessibility
- Ensure HTTPS protocol
- Check CORS headers if using custom domain

**Templates not downloading?**

- Verify file URLs are direct download links
- Check that files exist at specified URLs
- Ensure proper file permissions
