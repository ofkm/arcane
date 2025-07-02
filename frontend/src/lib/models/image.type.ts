import type Docker from 'dockerode';

export type ServiceImage = Docker.ImageInfo & {
	repo: string;
	tag: string; 
	Architecture?: string;
	Os?: string;
	Config?: {
		User?: string;
		ExposedPorts?: Record<string, any>;
		Env?: string[];
		Entrypoint?: string[];
		WorkingDir?: string;
		Labels?: Record<string, string>;
	};
	GraphDriver?: {
		Data: any;
		Name: string;
	};
	RootFS?: {
		Type: string;
		Layers: string[];
	};
	Metadata?: {
		LastTagTime?: string;
	};
	Descriptor?: {
		mediaType: string;
		digest: string;
		size: number;
	};
};

export interface ImageMaturity {
	version: string;
	date: string;
	status: 'Matured' | 'Not Matured' | 'Unknown';
	updatesAvailable: boolean;
}

export type EnhancedImageInfo = ServiceImage & {
	InUse: boolean;
	maturity?: ImageMaturity;
};
