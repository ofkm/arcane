import { json } from '@sveltejs/kit';
import { validateComposeConfiguration } from '$lib/utils/compose-validate.utils';
import type { ValidationMode } from '$lib/utils/compose-validate.utils';

export async function POST({ request }) {
	try {
		const { composeContent, envContent = '', mode = 'default' } = await request.json();

		if (!composeContent) {
			return json({ error: 'Compose content is required' }, { status: 400 });
		}

		if (!['default', 'strict', 'loose'].includes(mode)) {
			return json({ error: 'Invalid validation mode. Use: default, strict, or loose' }, { status: 400 });
		}

		const validation = await validateComposeConfiguration(composeContent, envContent, mode as ValidationMode);

		return json({
			...validation,
			mode
		});
	} catch (error) {
		console.error('Validation error:', error);
		return json(
			{
				valid: false,
				errors: [error instanceof Error ? error.message : 'Validation failed'],
				warnings: []
			},
			{ status: 500 }
		);
	}
}
