import type { PageServerLoad, Actions } from './$types';
import { getNetwork, removeNetwork } from '$lib/services/docker/network-service'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/services/docker/network-service.ts
import { error, fail, redirect } from '@sveltejs/kit';
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/types/errors.ts

export const load: PageServerLoad = async ({ params }) => {
	const networkId = params.networkId;

	try {
		const network = await getNetwork(networkId);

		// Note: NetworkInspectInfo contains container info directly in network.Containers
		return {
			network
		};
	} catch (err: any) {
		console.error(`Failed to load network ${networkId}:`, err);
		if (err instanceof NotFoundError) {
			error(404, { message: err.message });
		} else {
			error(err.status || 500, {
				message: err.message || `Failed to load network details for "${networkId}".`
			});
		}
	}
};

// Add action for removing the network from its details page
export const actions: Actions = {
	remove: async ({ params }) => {
		const networkId = params.networkId;
		try {
			await removeNetwork(networkId);
			// Redirect back to the main networks list after successful removal
			redirect(303, '/networks');
		} catch (err: any) {
			console.error(`Failed to remove network ${networkId}:`, err);
			// Handle specific errors from removeNetwork
			if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof DockerApiError) {
				return fail(err.status || 500, { error: err.message });
			}
			// Fallback for unexpected errors
			return fail(500, { error: err.message || 'An unexpected error occurred during removal.' });
		}
	}
};
