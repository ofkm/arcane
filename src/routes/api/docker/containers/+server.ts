import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listContainers } from '$lib/services/docker/container-service';

export const GET: RequestHandler = async () => {
	try {
		const containers = await listContainers(true); // Get all containers
		return json(containers);
	} catch (error: any) {
		console.error('API Error fetching containers:', error);
		// Return an appropriate error response
		return json({ error: error.message || 'Failed to fetch containers' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	// Create a new container using the service
	// try {
	//   const newContainer = await createContainer(data); // Assuming you add createContainer to docker.ts
	//   return json(newContainer, { status: 201 });
	// } catch (error: any) {
	//   return json({ error: error.message || 'Failed to create container' }, { status: 500 });
	// }

	// Placeholder response for now
	return json({
		message: 'Create endpoint not fully implemented',
		id: 'new_container_id',
		name: data.name
	});
};
