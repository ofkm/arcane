import { imageAPI, containerAPI, settingsAPI } from '$lib/services/api';
import type { EnhancedImageInfo } from '$lib/types/docker';
import type { Settings } from '$lib/types/settings.type';

type ImageData = {
	images: EnhancedImageInfo[];
	error?: string;
	settings: Settings;
};

export const load = async (): Promise<ImageData> => {
	try {
		const [images, settings] = await Promise.all([imageAPI.list() as Promise<EnhancedImageInfo[]>, settingsAPI.getSettings()]);

		const enhancedImages = await Promise.all(
			images.map(async (image): Promise<EnhancedImageInfo> => {
				// Check if image is in use via API
				const inUse = await containerAPI.isImageInUse(image.Id).catch(() => false);

				// Get maturity data from API
				let maturity = undefined;
				try {
					if (image.repo !== '<none>' && image.tag !== '<none>') {
						maturity = (await imageAPI.checkMaturity(image.Id)) as import('$lib/types/docker').ImageMaturity;
					}
				} catch (maturityError) {
					console.error(`Failed to check maturity for image ${image.Id}:`, maturityError);
				}

				return {
					...image,
					inUse,
					maturity
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
