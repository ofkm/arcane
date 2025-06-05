import { deployStack } from '$lib/services/docker/stack-custom-service';
import { json } from '@sveltejs/kit';
import { tryCatch } from '$lib/utils/try-catch';

export async function POST({ params, request }) {
	const { stackId } = params;

	try {
		// Handle empty or missing request body
		let body: { profiles?: string[]; envOverrides?: Record<string, string> } = {};

		try {
			const contentType = request.headers.get('content-type');

			if (contentType && contentType.includes('application/json')) {
				const text = await request.text();
				if (text.trim()) {
					body = JSON.parse(text);
				}
			}
		} catch (parseError) {
			console.warn('Failed to parse request body, using empty object:', parseError);
			// Continue with empty body object
		}

		const { profiles, envOverrides } = body;

		console.log(`Deploying stack ${stackId} with options:`, {
			profiles: profiles || [],
			envOverrides: envOverrides || {}
		});

		const result = await tryCatch(
			deployStack(stackId, {
				profiles: profiles || [],
				envOverrides: envOverrides || {}
			})
		);

		if (result.error) {
			console.error(`API Error deploying stack ${stackId}:`, result.error);
			return json({ error: result.error.message }, { status: 500 });
		}

		return json({ success: true, message: `Stack ${stackId} deployed successfully` });
	} catch (error) {
		console.error('Deploy endpoint error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json(
			{
				error: errorMessage,
				details: 'Failed to deploy stack'
			},
			{ status: 500 }
		);
	}
}

// Add GET endpoint for simple deployments without body
export async function GET({ params }) {
	const { stackId } = params;

	try {
		console.log(`Deploying stack ${stackId} (GET request - no options)`);

		const result = await tryCatch(
			deployStack(stackId, {
				profiles: [],
				envOverrides: {}
			})
		);

		if (result.error) {
			console.error(`API Error deploying stack ${stackId}:`, result.error);
			return json({ error: result.error.message }, { status: 500 });
		}

		return json({ success: true, message: `Stack ${stackId} deployed successfully` });
	} catch (error) {
		console.error('Deploy endpoint error (GET):', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json(
			{
				error: errorMessage,
				details: 'Failed to deploy stack'
			},
			{ status: 500 }
		);
	}
}
