import type { PageServerLoad } from './$types';
import { listImages, isImageInUse, checkImageMaturity } from '$lib/services/docker/image-service';
import type { EnhancedImageInfo, ServiceImage } from '$lib/types/docker';
import { getSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';

type ImageData = {
	images: EnhancedImageInfo[];
	error?: string;
	settings: Settings;
};

export const load: PageServerLoad = async (): Promise<ImageData> => {
	try {
		const images: ServiceImage[] = await listImages();
		const settings = await getSettings();

		const enhancedImages = await Promise.all(
			images.map(async (image): Promise<EnhancedImageInfo> => {
				const inUse = await isImageInUse(image.Id);

				let maturity = undefined;
				try {
					if (image.repo !== '<none>' && image.tag !== '<none>') {
						maturity = await checkImageMaturity(image.Id);
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
		const settings = await getSettings().catch(() => ({}) as Settings);
		return {
			images: [],
			error: err.message || 'Failed to connect to Docker or list images.',
			settings: settings
		};
	}
};
