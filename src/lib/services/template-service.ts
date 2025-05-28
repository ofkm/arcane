import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { TemplateRegistryConfig } from '$lib/types/template-registry';
import { templateRegistryService } from './template-registry-service';

export interface ComposeTemplate {
	id: string;
	name: string;
	description: string;
	content: string;
	isCustom: boolean;
	isRemote?: boolean;
	metadata?: {
		version?: string;
		author?: string;
		tags?: string[];
		registry?: string;
		remoteUrl?: string;
		documentationUrl?: string;
		iconUrl?: string;
		updatedAt?: string;
	};
}

export class TemplateService {
	private static templatesDir = path.join(process.cwd(), 'data/templates');
	private static composeTemplatesDir = path.join(this.templatesDir, 'compose');
	private static envTemplateFile = path.join(this.templatesDir, '.env.template');
	private registryConfigs: TemplateRegistryConfig[] = [];

	/**
	 * Get all available compose templates from the file system
	 */
	static async getComposeTemplates(): Promise<ComposeTemplate[]> {
		try {
			// Ensure directories exist
			await this.ensureDirectoriesExist();

			const files = await fs.readdir(this.composeTemplatesDir);
			const yamlFiles = files.filter((file) => (file.endsWith('.yaml') || file.endsWith('.yml')) && !file.startsWith('.'));

			const templates: ComposeTemplate[] = [];

			for (const file of yamlFiles) {
				const filePath = path.join(this.composeTemplatesDir, file);
				const content = await fs.readFile(filePath, 'utf8');
				const id = path.basename(file, path.extname(file));

				// Try to extract description from comment at top of file
				const description = this.extractDescriptionFromFile(content);

				templates.push({
					id,
					name: this.formatTemplateName(id),
					description: description || this.getDefaultDescription(id),
					content,
					isCustom: !this.isBuiltInTemplate(id)
				});
			}

			return templates.sort((a, b) => {
				// Sort built-in templates first, then custom templates
				if (a.isCustom !== b.isCustom) {
					return a.isCustom ? 1 : -1;
				}
				return a.name.localeCompare(b.name);
			});
		} catch (error) {
			console.error('Error loading compose templates:', error);
			return [];
		}
	}

	/**
	 * Get the .env template content if it exists
	 */
	static async getEnvTemplate(): Promise<string> {
		try {
			await this.ensureDirectoriesExist();
			return await fs.readFile(this.envTemplateFile, 'utf8');
		} catch (error) {
			console.log('No .env template found, using default');
			return this.getDefaultEnvTemplate();
		}
	}

	/**
	 * Create a new template from content
	 */
	static async createTemplate(name: string, content: string, description?: string): Promise<void> {
		await this.ensureDirectoriesExist();

		const filename = `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.yaml`;
		const filePath = path.join(this.composeTemplatesDir, filename);

		// Add description as comment if provided
		let fileContent = content;
		if (description) {
			fileContent = `# ${description}\n${content}`;
		}

		await fs.writeFile(filePath, fileContent, 'utf8');
	}

	/**
	 * Delete a template
	 */
	static async deleteTemplate(id: string): Promise<void> {
		const possibleExtensions = ['.yaml', '.yml'];
		let deleted = false;

		for (const ext of possibleExtensions) {
			const filePath = path.join(this.composeTemplatesDir, `${id}${ext}`);
			try {
				await fs.unlink(filePath);
				deleted = true;
				break;
			} catch (error) {
				// File doesn't exist with this extension, try next
			}
		}

		if (!deleted) {
			throw new Error(`Template with id "${id}" not found`);
		}
	}

	/**
	 * Get template directory path for users to add their own templates
	 */
	static getTemplateDirectoryPath(): string {
		return this.composeTemplatesDir;
	}

	/**
	 * Get env template file path
	 */
	static getEnvTemplateFilePath(): string {
		return this.envTemplateFile;
	}

	/**
	 * Ensure template directories exist
	 */
	private static async ensureDirectoriesExist(): Promise<void> {
		try {
			await fs.mkdir(this.templatesDir, { recursive: true });
			await fs.mkdir(this.composeTemplatesDir, { recursive: true });

			// Create README file to help users understand how to add templates
			const readmePath = path.join(this.templatesDir, 'README.md');
			try {
				await fs.access(readmePath);
			} catch {
				await this.createReadmeFile();
			}
		} catch (error) {
			console.error('Error ensuring template directories exist:', error);
		}
	}

	/**
	 * Create a helpful README file for users
	 */
	private static async createReadmeFile(): Promise<void> {
		const readmeContent = `# Arcane Templates

This directory contains templates for creating Docker Compose stacks.

## Directory Structure

- \`compose/\` - Docker Compose template files (.yaml or .yml)
- \`.env.template\` - Default environment variables template

## Adding Custom Templates

1. **Compose Templates**: Place your Docker Compose files in the \`compose/\` directory
   - Use \`.yaml\` or \`.yml\` extension
   - Add a comment at the top to describe the template:
     \`\`\`yaml
     # My Custom Application Stack
     services:
       app:
         image: nginx:alpine
         # ... rest of your compose file
     \`\`\`

2. **Environment Template**: Create or edit \`.env.template\` to set default environment variables
   - This will be loaded automatically when creating new stacks
   - Use KEY=value format

## Template Naming

- File names will be converted to display names
- \`my-web-app.yaml\` becomes "My Web App"
- Use hyphens or underscores to separate words

## Examples

See the built-in templates for examples of common configurations:
- nginx.yaml - Simple web server
- postgres.yaml - PostgreSQL database
- wordpress.yaml - WordPress with MySQL

Templates added here will automatically appear in the Arcane UI when creating new stacks.
`;

		await fs.writeFile(path.join(this.templatesDir, 'README.md'), readmeContent, 'utf8');
	}

	/**
	 * Extract description from file comment
	 */
	private static extractDescriptionFromFile(content: string): string | null {
		const lines = content.split('\n');
		const firstLine = lines[0]?.trim();

		if (firstLine?.startsWith('#')) {
			return firstLine.substring(1).trim();
		}

		return null;
	}

	/**
	 * Format template name for display
	 */
	private static formatTemplateName(id: string): string {
		return id
			.split(/[-_]/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	/**
	 * Check if template is a built-in one
	 */
	private static isBuiltInTemplate(id: string): boolean {
		const builtInTemplates = ['nginx', 'postgres', 'wordpress', 'mysql', 'redis', 'mongodb'];
		return builtInTemplates.includes(id);
	}

	/**
	 * Get default description for known templates
	 */
	private static getDefaultDescription(id: string): string {
		const descriptions: Record<string, string> = {
			nginx: 'Simple web server with volume mounting',
			postgres: 'PostgreSQL database with persistent storage',
			wordpress: 'WordPress with MySQL database',
			mysql: 'MySQL database server',
			redis: 'Redis in-memory data store',
			mongodb: 'MongoDB NoSQL database'
		};

		return descriptions[id] || 'Custom Docker Compose template';
	}

	/**
	 * Get default .env template content
	 */
	private static getDefaultEnvTemplate(): string {
		return `# Environment Variables
# These variables will be available to your stack services
# Format: VARIABLE_NAME=value

# Web Server Configuration
NGINX_HOST=localhost
NGINX_PORT=80

# Database Configuration
POSTGRES_DB=myapp
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_PORT=5432

# Example Additional Variables
# API_KEY=your_api_key_here
# SECRET_KEY=your_secret_key_here
# DEBUG=false
`;
	}

	/**
	 * Load all templates (local and remote)
	 */
	async loadAllTemplates(): Promise<ComposeTemplate[]> {
		const templates: ComposeTemplate[] = [];

		// Load local templates
		templates.push(...(await this.loadLocalTemplates()));

		// Load remote templates
		templates.push(...(await this.loadRemoteTemplates()));

		return templates;
	}

	/**
	 * Load local templates from the file system
	 */
	async loadLocalTemplates(): Promise<ComposeTemplate[]> {
		try {
			// Ensure directories exist
			await TemplateService.ensureDirectoriesExist();

			const files = await fs.readdir(TemplateService.composeTemplatesDir);
			const yamlFiles = files.filter((file) => (file.endsWith('.yaml') || file.endsWith('.yml')) && !file.startsWith('.'));

			const templates: ComposeTemplate[] = [];

			for (const file of yamlFiles) {
				const filePath = path.join(TemplateService.composeTemplatesDir, file);
				const content = await fs.readFile(filePath, 'utf8');
				const id = path.basename(file, path.extname(file));

				// Try to extract description from comment at top of file
				const description = TemplateService.extractDescriptionFromFile(content);

				templates.push({
					id,
					name: TemplateService.formatTemplateName(id),
					description: description || TemplateService.getDefaultDescription(id),
					content,
					isCustom: !TemplateService.isBuiltInTemplate(id),
					isRemote: false
				});
			}

			return templates.sort((a, b) => {
				// Sort built-in templates first, then custom templates
				if (a.isCustom !== b.isCustom) {
					return a.isCustom ? 1 : -1;
				}
				return a.name.localeCompare(b.name);
			});
		} catch (error) {
			console.error('Error loading local templates:', error);
			return [];
		}
	}

	/**
	 * Load remote templates
	 */
	async loadRemoteTemplates(): Promise<ComposeTemplate[]> {
		const templates: ComposeTemplate[] = [];

		for (const config of this.registryConfigs) {
			if (!config.enabled) continue;

			const registry = await templateRegistryService.fetchRegistry(config);
			if (!registry) continue;

			for (const remoteTemplate of registry.templates) {
				const template = templateRegistryService.convertToComposeTemplate(remoteTemplate, config.name);
				templates.push(template);
			}
		}

		return templates;
	}

	/**
	 * Load template content
	 */
	async loadTemplateContent(template: ComposeTemplate): Promise<string> {
		if (template.isRemote && template.metadata?.remoteUrl) {
			const content = await templateRegistryService.fetchTemplateContent({
				id: template.id,
				name: template.name,
				description: template.description,
				version: template.metadata.version || '1.0.0',
				compose_url: template.metadata.remoteUrl,
				updated_at: template.metadata.updatedAt || new Date().toISOString()
			});
			return content || template.content;
		}
		return template.content;
	}

	/**
	 * Add a registry configuration
	 */
	addRegistry(config: TemplateRegistryConfig): void {
		this.registryConfigs.push(config);
	}

	/**
	 * Remove a registry configuration
	 */
	removeRegistry(url: string): void {
		this.registryConfigs = this.registryConfigs.filter((c) => c.url !== url);
	}

	/**
	 * Get all registry configurations
	 */
	getRegistries(): TemplateRegistryConfig[] {
		return [...this.registryConfigs];
	}
}
