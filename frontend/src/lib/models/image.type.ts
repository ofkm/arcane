import type Docker from 'dockerode';

/**
 * Represents a Docker image, extending Dockerode's ImageInfo with parsed repo and tag.
 * Properties like Id, RepoTags, Created, Size, etc., are inherited from Docker.ImageInfo.
 */
export type ServiceImage = Docker.ImageInfo & {
	repo: string; // Parsed repository name
	tag: string; // Parsed tag
};

/**
 * Represents the maturity status of a Docker image.
 */
export interface ImageMaturity {
	version: string;
	date: string;
	status: 'Matured' | 'Not Matured' | 'Unknown';
	updatesAvailable: boolean;
}

/**
 * Extends ServiceImage with application-specific information like usage status and maturity.
 */
export type EnhancedImageInfo = ServiceImage & {
	InUse: boolean;
	maturity?: ImageMaturity;
};
