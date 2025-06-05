import { json } from '@sveltejs/kit';
import { detectStackChanges } from '$lib/services/docker/stack-custom-service';
import { tryCatch } from '$lib/utils/try-catch';

export async function GET({ params }) {
	const { stackId } = params;

	const result = await tryCatch(detectStackChanges(stackId));

	if (result.error) {
		return json({ error: result.error.message }, { status: 500 });
	}

	return json(result.data);
}
