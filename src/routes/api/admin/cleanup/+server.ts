import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupService } from '$lib/services/database/cleanup-service';

// GET - Get cleanup statistics
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const stats = await cleanupService.getCleanupStats();

		return json({
			success: true,
			stats
		});
	} catch (error) {
		console.error('Error getting cleanup stats:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get cleanup stats'
			},
			{ status: 500 }
		);
	}
};

// POST - Run database cleanup
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const config = body.config || {};

		console.log(`🧹 Admin ${locals.user.username} triggered database cleanup`);

		const result = await cleanupService.runCleanup(config);

		return json({
			success: result.success,
			summary: result.summary,
			errors: result.errors
		});
	} catch (error) {
		console.error('Error running cleanup:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to run cleanup'
			},
			{ status: 500 }
		);
	}
};
