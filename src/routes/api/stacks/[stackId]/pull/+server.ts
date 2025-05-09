import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getStack } from '$lib/services/docker/stack-service';
import Docker from 'dockerode';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;
	const docker = new Docker();

	// Get the stack to access its compose content
	const stackResult = await tryCatch(getStack(id));
	if (stackResult.error || !stackResult.data || !stackResult.data.composeContent) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack not found or has no compose content',
			code: ApiErrorCode.NOT_FOUND,
			details: stackResult.error
		};
		return json(response, { status: 404 });
	}
	const stack = stackResult.data;

	// Parse the compose file to extract image names
	const composeLines = stack.composeContent!.split('\n');
	const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));

	if (imageLines.length === 0) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'No images found in stack compose file',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	// Extract image names
	const imageNames = imageLines.map((line) => {
		const imagePart = line.split('image:')[1].trim();
		return imagePart.replace(/['"]/g, '').split(' ')[0];
	});

	// Pull each image using tryCatch for each pull
	const pullResults = await Promise.all(
		imageNames.map(async (imageName) => {
			const pullResult = await tryCatch(docker.pull(imageName));
			if (pullResult.error) {
				console.error(`Error pulling image ${imageName}:`, pullResult.error);
				return { image: imageName, success: false, error: pullResult.error.message || pullResult.error };
			}
			// Process the stream
			return new Promise((resolve) => {
				docker.modem.followProgress(
					pullResult.data,
					(err: any) => {
						if (err) {
							console.error(`Error in followProgress for ${imageName}:`, err);
							resolve({ image: imageName, success: false, error: err.message || err });
						} else {
							resolve({ image: imageName, success: true });
						}
					},
					(event: any) => {
						// Optional: handle progress events
						console.log(`Pull progress for ${imageName}:`, event);
					}
				);
			});
		})
	);

	const allSuccessful = pullResults.every((result: any) => result.success);

	if (allSuccessful) {
		return json({
			success: true,
			message: `All images for stack pulled successfully`,
			details: pullResults
		});
	} else {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Some images failed to pull',
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: pullResults
		};
		return json(response, { status: 500 });
	}
};
