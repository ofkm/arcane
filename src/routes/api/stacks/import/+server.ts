import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importExternalStack } from '$lib/services/docker/stack-service';

export const POST: RequestHandler = async ({ request }) => {
	const { stackId, stackName } = await request.json();

	if (!stackId) {
		return json({ success: false, error: 'Stack ID is required' }, { status: 400 });
	}

	try {
		const importedStack = await importExternalStack(stackId);

		console.log(`Successfully imported stack: ${stackId} (${stackName || importedStack.name})`);

		return json({
			success: true,
			stack: importedStack,
			message: `Successfully imported stack ${importedStack.name}`
		});
	} catch (err) {
		console.error(`Error importing stack ${stackId}:`, err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Failed to import stack'
			},
			{ status: 500 }
		);
	}
};
