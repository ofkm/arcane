import { json } from '@sveltejs/kit';
import { previewStackDeployment } from '$lib/services/docker/stack-custom-service';
import { tryCatch } from '$lib/utils/try-catch';

export async function POST({ params, request }) {
	const { stackId } = params;

	try {
		const body = await request.json();
		const { profiles } = body;

		const result = await tryCatch(previewStackDeployment(stackId, profiles || []));

		if (result.error) {
			return json({ error: result.error.message }, { status: 500 });
		}

		return json(result.data);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 });
	}
}
