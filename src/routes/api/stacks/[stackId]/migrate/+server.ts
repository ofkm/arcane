import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { migrateStackToNameFolder } from '$lib/services/docker/stack-migration-service';

export const POST: RequestHandler = async ({ params }) => {
	const { stackId } = params;

	if (!stackId) {
		throw error(400, 'Missing stackId');
	}

	try {
		await migrateStackToNameFolder(stackId);
		return json({ success: true, message: `Stack "${stackId}" migrated successfully.` });
	} catch (err: any) {
		console.error(err);
		throw error(500, err?.message || 'Failed to migrate stack');
	}
};
