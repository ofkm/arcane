import type { TemplateRegistry, RemoteTemplate } from '$lib/types/template-registry';
import type { TemplateRegistryConfig } from '$lib/types/settings.type';
import type { ComposeTemplate } from '$lib/services/template-service';
import { browser } from '$app/environment';

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

			let registry: TemplateRegistry;

			if (browser) {
				const proxyUrl = `/api/templates?url=${encodeURIComponent(config.url)}`;
				const response = await fetch(proxyUrl);

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({ message: response.statusText }));
					throw new Error(errorData.message || `Failed to fetch registry: ${response.statusText}`);
				}

				registry = await response.json();
			} else {
				// Direct fetch on server-side
				const response = await fetch(config.url, {
					headers: {
						'User-Agent': 'Arcane-Template-Registry/1.0',
						Accept: 'application/json'
					}
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch registry: ${response.statusText}`);
				}

				registry = await response.json();
			}

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
			if (browser) {
				// Use unified proxy endpoint in browser
				const response = await fetch('/api/templates', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						url: template.compose_url,
						content: true
					})
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({ message: response.statusText }));
					throw new Error(errorData.message || `Failed to fetch template content: ${response.statusText}`);
				}

				const data = await response.json();
				return data.content;
			} else {
				// Direct fetch on server-side
				const response = await fetch(template.compose_url, {
					headers: {
						'User-Agent': 'Arcane-Template-Registry/1.0',
						Accept: 'text/plain, application/x-yaml, text/yaml, */*'
					}
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch template content: ${response.statusText}`);
				}

				return await response.text();
			}
		} catch (error) {
			console.error(`Error fetching template content from ${template.compose_url}:`, error);
			return null;
		}
	}

	async fetchEnvContent(envUrl: string): Promise<string | null> {
		try {
			if (browser) {
				// Use unified proxy endpoint in browser
				const response = await fetch('/api/templates', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						url: envUrl,
						content: true
					})
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({ message: response.statusText }));
					throw new Error(errorData.message || `Failed to fetch environment content: ${response.statusText}`);
				}

				const data = await response.json();
				return data.content;
			} else {
				// Direct fetch on server-side
				const response = await fetch(envUrl, {
					headers: {
						'User-Agent': 'Arcane-Template-Registry/1.0',
						Accept: 'text/plain, */*'
					}
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch environment content: ${response.statusText}`);
				}

				return await response.text();
			}
		} catch (error) {
			console.error(`Error fetching environment content from ${envUrl}:`, error);
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
				envUrl: remote.env_url,
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
