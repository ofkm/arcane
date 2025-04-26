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

export type EnhancedImageInfo = ServiceImage & {
	inUse: boolean;
};