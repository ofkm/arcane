import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { templateRegistryService } from '$lib/services/template-registry-service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url } = await request.json();

		if (!url) {
			return error(400, { message: 'URL is required' });
		}

		const config = {
			url,
			name: 'Test Registry',
			enabled: true
		};

		const registry = await templateRegistryService.fetchRegistry(config);

		if (!registry) {
			return error(400, { message: 'Failed to fetch registry or invalid format' });
		}

		return json({
			success: true,
			message: 'Registry is valid and accessible',
			registry: {
				name: registry.name,
				description: registry.description,
				version: registry.version,
				templateCount: registry.templates.length
			}
		});
	} catch (err) {
		console.error('Error testing registry:', err);
		return error(500, { message: 'Failed to test registry' });
	}
};
