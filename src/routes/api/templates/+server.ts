import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TemplateService } from '$lib/services/template-service';

const templateService = new TemplateService();

export const GET: RequestHandler = async ({ url }) => {
	// Check if this is a proxy request for external registries
	const registryUrl = url.searchParams.get('url');

	if (registryUrl) {
		// Handle proxy request for external registry
		try {
			// Validate URL format
			const urlObj = new URL(registryUrl);
			if (!['http:', 'https:'].includes(urlObj.protocol)) {
				return error(400, { message: 'Invalid URL protocol. Only HTTP and HTTPS are allowed.' });
			}

			console.log(`Proxying template registry request to: ${registryUrl}`);

			const response = await fetch(registryUrl, {
				headers: {
					'User-Agent': 'Arcane-Template-Registry/1.0',
					Accept: 'application/json, text/plain'
				},
				// Add timeout to prevent hanging requests
				signal: AbortSignal.timeout(30000) // 30 second timeout
			});

			if (!response.ok) {
				console.error(`Failed to fetch registry from ${registryUrl}: ${response.status} ${response.statusText}`);
				return error(response.status, {
					message: `Failed to fetch registry: ${response.statusText}`
				});
			}

			const contentType = response.headers.get('content-type');
			// GitHub serves JSON files with text/plain content type
			const allowedHosts = ['raw.githubusercontent.com', 'githubusercontent.com'];
			const isGitHub = allowedHosts.includes(urlObj.host);
			const isValidContentType = contentType?.includes('application/json') || contentType?.includes('text/json') || (isGitHub && contentType?.includes('text/plain'));

			if (!isValidContentType) {
				console.warn(`Registry at ${registryUrl} returned unexpected content type: ${contentType}`);
			}

			let data;
			try {
				data = await response.json();
			} catch (jsonError) {
				return error(400, { message: 'Invalid JSON response from registry' });
			}

			// Add CORS headers to allow client-side access
			return json(data, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET',
					'Access-Control-Allow-Headers': 'Content-Type'
				}
			});
		} catch (fetchError) {
			console.error(`Error fetching template registry from ${registryUrl}:`, fetchError);

			if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
				return error(503, { message: 'Unable to reach the registry server. Please check the URL and try again.' });
			}

			return error(500, {
				message: fetchError instanceof Error ? fetchError.message : 'Failed to fetch registry'
			});
		}
	}

	// Handle template list requests
	try {
		const type = url.searchParams.get('type');

		let templates;
		switch (type) {
			case 'local':
				templates = await templateService.loadLocalTemplates();
				break;
			case 'remote':
				templates = await templateService.loadRemoteTemplates();
				break;
			default:
				templates = await templateService.loadAllTemplates();
		}

		return json(templates);
	} catch (err) {
		console.error('Error fetching templates:', err);
		return error(500, { message: 'Failed to fetch templates' });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	// Check if this is a proxy request for content
	if (body.url && body.content) {
		try {
			console.log(`Proxying template content request to: ${body.url}`);

			const response = await fetch(body.url, {
				headers: {
					'User-Agent': 'Arcane-Template-Registry/1.0',
					Accept: 'text/plain, application/x-yaml, text/yaml, */*'
				},
				signal: AbortSignal.timeout(30000)
			});

			if (!response.ok) {
				return error(response.status, {
					message: `Failed to fetch content: ${response.statusText}`
				});
			}

			const data = await response.text();

			return json(
				{ content: data },
				{
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'POST',
						'Access-Control-Allow-Headers': 'Content-Type'
					}
				}
			);
		} catch (fetchError) {
			console.error(`Error fetching template content from ${body.url}:`, fetchError);
			return error(500, {
				message: fetchError instanceof Error ? fetchError.message : 'Failed to fetch content'
			});
		}
	}

	// Handle template creation
	try {
		const { name, content, description, envContent } = body;

		if (!name || !content) {
			return error(400, { message: 'Name and content are required' });
		}

		await TemplateService.createTemplate(name, content, description, envContent);

		return json({
			success: true,
			message: 'Template created successfully',
			id: name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
		});
	} catch (err) {
		console.error('Error creating template:', err);
		return error(500, { message: 'Failed to create template' });
	}
};
