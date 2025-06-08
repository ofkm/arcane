export interface TemplateRegistry {
	id: number;
	name: string;
	url: string;
	enabled: boolean;
	description: string;
	createdAt: string;
	updatedAt: string;
}

export interface Template {
	id: string;
	name: string;
	description: string;
	content: string;
	envContent?: string;
	isCustom: boolean;
	isRemote: boolean;
	registryId?: number;
	registry?: TemplateRegistry;
	metadata?: {
		version?: string;
		author?: string;
		tags?: string | string[];
		remoteUrl?: string;
		envUrl?: string;
		documentationUrl?: string;
		iconUrl?: string;
		updatedAt?: string;
	};
	createdAt: string;
	updatedAt: string;
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

export interface TemplateEnvVar {
	name: string;
	label?: string;
	description?: string;
	default?: string;
	preset?: boolean;
	select?: TemplateSelectOption[];
}

export interface TemplateSelectOption {
	text: string;
	value: string;
	default?: boolean;
}

export interface TemplateVolume {
	container: string;
	bind?: string;
	readonly?: boolean;
}
