import type { PageServerLoad } from './$types';
import { listImages, isImageInUse } from '$lib/services/docker/image-service';
import type { EnhancedImageInfo } from '$lib/types/docker';

type ImageData = {
	images: EnhancedImageInfo[];
	error?: string;
};

export const load: PageServerLoad = async (): Promise<ImageData> => {
	try {
		const images = await listImages();

		// Enhance images with usage information
		const enhancedImages = await Promise.all(
			images.map(async (image): Promise<EnhancedImageInfo> => {
				const inUse = await isImageInUse(image.id);
				return {
					...image,
					inUse
				};
			})
		);

		return {
			images: enhancedImages
		};
	} catch (err: any) {
		console.error('Failed to load images:', err);
		return {
			images: [],
			error: err.message || 'Failed to connect to Docker or list images.'
		};
	}
};
