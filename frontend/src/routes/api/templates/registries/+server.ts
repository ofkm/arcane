import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TemplateService } from '$lib/services/template-service';
import { templateRegistryService } from '$lib/services/template-registry-service';
import type { TemplateRegistryConfig } from '$lib/types/settings.type';

const templateService = new TemplateService();

export const GET: RequestHandler = async () => {
	try {
		const registries = await templateService.getRegistries();
		return json(registries);
	} catch (err) {
		console.error('Error fetching registries:', err);
		return error(500, { message: 'Failed to fetch registries' });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const config: TemplateRegistryConfig = await request.json();

		if (!config.url || !config.name) {
			return error(400, { message: 'URL and name are required' });
		}

		// Test the registry before adding
		const registry = await templateRegistryService.fetchRegistry(config);
		if (!registry) {
			return error(400, { message: 'Failed to fetch registry or invalid format' });
		}

		await templateService.addRegistry(config);

		return json({
			success: true,
			message: 'Registry added successfully',
			registry: config
		});
	} catch (err) {
		console.error('Error adding registry:', err);
		return error(500, { message: 'Failed to add registry' });
	}
};
