import type { PageServerLoad } from './$types';
import { listImages, isImageInUse, checkImageMaturity } from '$lib/services/docker/image-service';
import type { EnhancedImageInfo } from '$lib/types/docker';
import { getSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';

type ImageData = {
	images: EnhancedImageInfo[];
	error?: string;
	settings: Settings;
};

export const load: PageServerLoad = async (): Promise<ImageData> => {
	try {
		const images = await listImages();
		const settings = await getSettings();

		const enhancedImages = await Promise.all(
			images.map(async (image): Promise<EnhancedImageInfo> => {
				const inUse = await isImageInUse(image.id);

				// Add maturity check without modifying existing logic
				let maturity = undefined;
				try {
					if (image.repo !== '<none>' && image.tag !== '<none>') {
						maturity = await checkImageMaturity(image.id);
					}
				} catch (maturityError) {
					console.error(`Failed to check maturity for image ${image.id}:`, maturityError);
					// Don't let maturity errors affect the main flow
				}

				return {
					...image,
					inUse,
					maturity // Add maturity info if available
				};
			})
		);

		return {
			images: enhancedImages,
			settings
		};
	} catch (err: any) {
		console.error('Failed to load images:', err);
		return {
			images: [],
			error: err.message || 'Failed to connect to Docker or list images.',
			settings: {} as Settings
		};
	}
};
