import { environmentAPI } from '$lib/services/api';
import type { EnhancedImageInfo } from '$lib/models/image.type';
import { error } from '@sveltejs/kit';

type ImageDetailData = {
	image: EnhancedImageInfo;
	error?: string;
};

export const load = async ({ params }): Promise<ImageDetailData> => {
	const { imageId } = params;

	try {
		const image = await environmentAPI.getImage(imageId);

		if (!image) {
			throw error(404, 'Image not found');
		}

		let repo = '<none>';
		let tag = '<none>';
		if (image.RepoTags && image.RepoTags.length > 0) {
			const repoTag = image.RepoTags[0];
			if (repoTag.includes(':')) {
				[repo, tag] = repoTag.split(':');
			} else {
				repo = repoTag;
				tag = 'latest';
			}
		}

		return {
			image: {
				...image,
				repo,
				tag
			}
		};
	} catch (err: any) {
		console.error('Failed to load image:', err);
		if (err.status === 404) {
			throw err;
		}
		throw error(500, err.message || 'Failed to load image details');
	}
};
