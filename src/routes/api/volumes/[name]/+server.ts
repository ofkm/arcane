import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeVolume } from '$lib/services/docker/volume-service';

export const DELETE: RequestHandler = async ({ params, url }) => {
	const { name } = params;
	const force = url.searchParams.get('force') === 'true';

	try {
		await removeVolume(name, force);
		return json({ success: true });
	} catch (error: any) {
		console.error('API Error removing volume:', error);
		return json({ error: `Failed to remove volume: ${error.message || 'Unknown error'}` }, { status: 500 });
	}
};
