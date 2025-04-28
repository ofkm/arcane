import { json, error as serverError } from '@sveltejs/kit';
import { listContainers, stopContainer } from '$lib/services/docker/container-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	console.log('API: POST /api/containers/stop-all');
	try {
		const containers = await listContainers(true); // Fetch all containers
		const running = containers.filter((c) => c.state === 'running');
		if (running.length === 0) {
			return json({ success: true, count: 0, message: 'No running containers to stop.' });
		}
		await Promise.all(running.map((c) => stopContainer(c.id)));
		console.log(`API: Stopped ${running.length} containers.`);
		return json({ success: true, count: running.length, message: `Successfully stopped ${running.length} container(s).` });
	} catch (err: any) {
		console.error('API Error (stopAllRunning):', err);
		throw serverError(500, err.message || 'Failed to stop running containers.');
	}
};
