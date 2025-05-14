export type ServiceImage = {
	id: string;
	repoTags: string[] | undefined;
	repoDigests: string[] | undefined;
	created: number;
	size: number;
	virtualSize: number;
	labels: { [label: string]: string } | undefined;
	repo: string;
	tag: string;
};

export interface ImageMaturity {
	version: string;
	date: string;
	status: 'Matured' | 'Not Matured' | 'Unknown';
	updatesAvailable: boolean;
}

export type EnhancedImageInfo = ServiceImage & {
	inUse: boolean;
	maturity?: ImageMaturity;
};
