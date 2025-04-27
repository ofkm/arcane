import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getStack } from '$lib/services/docker/stack-service';
import Docker from 'dockerode';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;
	const docker = new Docker();

	try {
		// Get the stack to access its compose content
		const stack = await getStack(id);
		if (!stack || !stack.composeContent) {
			return json({ success: false, error: 'Stack not found or has no compose content' }, { status: 404 });
		}

		// Parse the compose file to extract image names
		// This is a simplified approach - you might need more robust parsing
		const composeLines = stack.composeContent.split('\n');
		const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));

		if (imageLines.length === 0) {
			return json({ success: false, error: 'No images found in stack compose file' }, { status: 400 });
		}

		// Extract image names
		const imageNames = imageLines.map((line) => {
			const imagePart = line.split('image:')[1].trim();
			// Remove any quotes or trailing characters
			return imagePart.replace(/['"]/g, '').split(' ')[0];
		});

		// Pull each image
		const pullResults = await Promise.all(
			imageNames.map(async (imageName) => {
				try {
					const stream = await docker.pull(imageName);

					// Process the stream
					return new Promise((resolve, reject) => {
						docker.modem.followProgress(
							stream,
							(err: any, output: any[]) => {
								if (err) {
									reject(err);
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
				} catch (error) {
					console.error(`Error pulling image ${imageName}:`, error);
					return { image: imageName, success: false, error };
				}
			})
		);

		// Check if all pulls were successful
		const allSuccessful = pullResults.every((result: any) => result.success);

		if (allSuccessful) {
			return json({
				success: true,
				message: `All images for stack pulled successfully`,
				details: pullResults
			});
		} else {
			return json(
				{
					success: false,
					error: 'Some images failed to pull',
					details: pullResults
				},
				{ status: 500 }
			);
		}
	} catch (error: any) {
		console.error(`API Error pulling images for stack ${id}:`, error);
		return json({ success: false, error: error.message || 'Failed to pull stack images' }, { status: 500 });
	}
};
