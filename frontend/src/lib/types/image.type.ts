export interface ImageUpdateInfoDto {
	hasUpdate: boolean;
	updateType: string;
	currentVersion: string;
	latestVersion: string;
	currentDigest: string;
	latestDigest: string;
	checkTime: string;
	responseTimeMs: number;
	error: string;
	authMethod?: 'none' | 'anonymous' | 'credential' | 'unknown';
	authUsername?: string;
	authRegistry?: string;
	usedCredential?: boolean;
}

export interface ImageUsageCounts {
	imagesInuse: number;
	imagesUnused: number;
	totalImages: number;
	totalImageSize: number;
}

export interface ImageSummaryDto {
	id: string;
	repoTags: string[];
	repoDigests: string[];
	created: number;
	size: number;
	virtualSize: number;
	labels: Record<string, unknown> | null;
	inUse: boolean;
	repo: string;
	tag: string;
	updateInfo?: ImageUpdateInfoDto;
}

export interface ImageDetailSummaryDto {
	id: string;
	repoTags: string[];
	repoDigests: string[];
	parent: string;
	comment: string;
	created: string; // ISO string
	dockerVersion: string;
	author: string;
	config: {
		exposedPorts?: Record<string, unknown>;
		env?: string[];
		cmd?: string[];
		volumes?: Record<string, unknown>;
		workingDir?: string;
		argsEscaped?: boolean;
	};
	architecture: string;
	os: string;
	size: number;
	graphDriver: {
		data: unknown | null;
		name: string;
	};
	rootFs: {
		type: string;
		layers: string[];
	};
	metadata: {
		lastTagTime: string;
	};
	descriptor: {
		mediaType: string;
		digest: string;
		size: number;
	};
}

export type ImageUpdateData = ImageUpdateInfoDto;

export interface ImageUpdateSummary {
	totalImages: number;
	imagesWithUpdates: number;
	digestUpdates: number;
	tagUpdates: number;
	errorsCount: number;
}

export interface ImageVersions {
	imageRef: string;
	current: string;
	versions: string[];
	latest?: string;
}

export interface VersionComparison {
	currentVersion: string;
	targetVersion: string;
	isNewer: boolean;
	updateType: string;
	changeLevel: string;
}

export interface BatchImageUpdateRequest {
	imageRefs: string[];
}

export interface CompareVersionRequest {
	currentVersion: string;
	targetVersion: string;
	imageRef: string;
}
