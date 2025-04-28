import { json, error as serverError } from '@sveltejs/kit';
import { listContainers, startContainer } from '$lib/services/docker/container-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	console.log('API: POST /api/containers/start-all');
	try {
		const containers = await listContainers(true); // Fetch all containers
		const stopped = containers.filter((c) => c.state === 'exited');
		if (stopped.length === 0) {
			return json({ success: true, count: 0, message: 'No stopped containers to start.' });
		}
		await Promise.all(stopped.map((c) => startContainer(c.id)));
		console.log(`API: Started ${stopped.length} containers.`);
		return json({ success: true, count: stopped.length, message: `Successfully started ${stopped.length} container(s).` });
	} catch (err: any) {
		console.error('API Error (startAllStopped):', err);
		throw serverError(500, err.message || 'Failed to start stopped containers.');
	}
};
