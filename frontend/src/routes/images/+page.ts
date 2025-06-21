import { environmentAPI, settingsAPI } from '$lib/services/api';
import type { EnhancedImageInfo } from '$lib/models/image.type';
import type { Settings } from '$lib/types/settings.type';

type ImageData = {
	images: EnhancedImageInfo[];
	error?: string;
	settings: Settings;
};

export const load = async (): Promise<ImageData> => {
	try {
		const [images, settings] = await Promise.all([environmentAPI.getImages(), settingsAPI.getSettings()]);

		const enhancedImages = await Promise.all(
			images.map(async (image): Promise<EnhancedImageInfo> => {
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
					...image,
					repo,
					tag
				};
			})
		);

		return {
			images: enhancedImages,
			settings
		};
	} catch (err: any) {
		console.error('Failed to load images:', err);
		const settings = await settingsAPI.getSettings().catch(() => ({}) as Settings);
		return {
			images: [],
			error: err.message || 'Failed to connect to Docker or list images.',
			settings: settings
		};
	}
};
