export interface TemplateRegistry {
	id: string;
	name: string;
	url: string;
	description?: string;
	enabled: boolean;
	lastUpdated?: string;
	templates?: Template[];
}

export interface Template {
	id: string;
	name: string;
	title: string;
	description: string;
	note?: string;
	categories: string[];
	platform: string;
	logo?: string;
	image?: string;
	repository?: {
		url: string;
		stackfile: string;
	};
	env?: TemplateEnvVar[];
	ports?: string[];
	volumes?: TemplateVolume[];
	restart_policy?: string;
	maintainer?: string;
	registry?: string;
	registryId?: string;
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
