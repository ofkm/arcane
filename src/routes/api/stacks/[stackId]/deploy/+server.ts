import { deployStack } from '$lib/services/docker/stack-custom-service';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export async function POST({ params, request }) {
	const { stackId } = params;

	try {
		const body = await request.json();
		const { profiles, envOverrides } = body;

		const result = await tryCatch(
			deployStack(stackId, {
				profiles: profiles || [],
				envOverrides: envOverrides || {}
			})
		);

		if (result.error) {
			return json({ error: result.error.message }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Deploy error:', error);
		return json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
	}
}
