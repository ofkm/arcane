import type { PageServerLoad } from './$types';
import { listImagesWithPagination, isImageInUse, checkImageMaturity } from '$lib/services/docker/image-service';
import type { EnhancedImageInfo } from '$lib/types/docker';
import { getSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';

type ImageData = {
	images: EnhancedImageInfo[];
	totalImages: number;
	imagePagination: {
		currentPage: number;
		pageSize: number;
		totalPages: number;
	};
	error?: string;
	settings: Settings;
};

export const load: PageServerLoad = async ({ url }): Promise<ImageData> => {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
		const nameFilter = url.searchParams.get('name') || undefined;
		const danglingFilter = url.searchParams.get('dangling') === 'true' ? true : url.searchParams.get('dangling') === 'false' ? false : undefined;

		const {
			images: paginatedImages,
			total,
			totalPages
		} = await listImagesWithPagination(page, pageSize, {
			name: nameFilter,
			dangling: danglingFilter
		});

		const settings = await getSettings();

		const enhancedImages = await Promise.all(
			paginatedImages.map(async (image): Promise<EnhancedImageInfo> => {
				const inUse = await isImageInUse(image.Id);

				let maturity = undefined;
				try {
					if (image.repo !== '<none>' && image.tag !== '<none>') {
						maturity = await checkImageMaturity(image.Id);
					}
				} catch (maturityError) {
					console.error(`Failed to check maturity for image ${image.Id} (${image.RepoTags ? image.RepoTags[0] : 'N/A'}):`, maturityError);
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
			totalImages: total,
			imagePagination: {
				currentPage: page,
				pageSize,
				totalPages
			},
			settings
		};
	} catch (err: any) {
		console.error('Failed to load images:', err);
		const settings = await getSettings().catch(() => ({}) as Settings);
		return {
			images: [],
			totalImages: 0,
			imagePagination: {
				currentPage: 1,
				pageSize: 25,
				totalPages: 0
			},
			error: err.message || 'Failed to connect to Docker or list images.',
			settings: settings
		};
	}
};
