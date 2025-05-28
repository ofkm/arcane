import type { TemplateRegistry, RemoteTemplate, TemplateRegistryConfig } from '$lib/types/template-registry';
import type { ComposeTemplate } from '$lib/services/template-service';

export class TemplateRegistryService {
	private cache = new Map<string, { data: TemplateRegistry; timestamp: number }>();
	private readonly defaultCacheTtl = 3600; // 1 hour

	async fetchRegistry(config: TemplateRegistryConfig): Promise<TemplateRegistry | null> {
		try {
			// Check cache first
			const cached = this.cache.get(config.url);
			const now = Date.now();
			const ttl = (config.cache_ttl || this.defaultCacheTtl) * 1000;

			if (cached && now - cached.timestamp < ttl) {
				return cached.data;
			}

			// Fetch from URL
			const response = await fetch(config.url);
			if (!response.ok) {
				throw new Error(`Failed to fetch registry: ${response.statusText}`);
			}

			const registry: TemplateRegistry = await response.json();

			// Validate registry structure
			this.validateRegistry(registry);

			// Cache the result
			this.cache.set(config.url, { data: registry, timestamp: now });

			return registry;
		} catch (error) {
			console.error(`Error fetching template registry from ${config.url}:`, error);
			return null;
		}
	}

	async fetchTemplateContent(template: RemoteTemplate): Promise<string | null> {
		try {
			const response = await fetch(template.compose_url);
			if (!response.ok) {
				throw new Error(`Failed to fetch template content: ${response.statusText}`);
			}
			return await response.text();
		} catch (error) {
			console.error(`Error fetching template content from ${template.compose_url}:`, error);
			return null;
		}
	}

	convertToComposeTemplate(remote: RemoteTemplate, registryName: string): ComposeTemplate {
		return {
			id: `${registryName}:${remote.id}`,
			name: remote.name,
			description: remote.description,
			content: '', // Will be loaded on demand
			isCustom: true,
			isRemote: true,
			metadata: {
				version: remote.version,
				author: remote.author,
				tags: remote.tags,
				registry: registryName,
				remoteUrl: remote.compose_url,
				documentationUrl: remote.documentation_url,
				iconUrl: remote.icon_url,
				updatedAt: remote.updated_at
			}
		};
	}

	private validateRegistry(registry: TemplateRegistry): void {
		if (!registry.name || !registry.version || !Array.isArray(registry.templates)) {
			throw new Error('Invalid registry format');
		}

		for (const template of registry.templates) {
			if (!template.id || !template.name || !template.compose_url) {
				throw new Error(`Invalid template format: ${template.id}`);
			}
		}
	}

	clearCache(): void {
		this.cache.clear();
	}
}

export const templateRegistryService = new TemplateRegistryService();
