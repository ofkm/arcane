export interface TemplateRegistry {
	name: string;
	description: string;
	version: string;
	templates: RemoteTemplate[];
}

export interface RemoteTemplate {
	id: string;
	name: string;
	description: string;
	version: string;
	author?: string;
	tags?: string[];
	compose_url: string;
	env_url?: string;
	documentation_url?: string;
	icon_url?: string;
	updated_at: string;
}

export interface TemplateRegistryConfig {
	url: string;
	name: string;
	enabled: boolean;
	last_updated?: string;
	cache_ttl?: number;
}
