import type { PageServerLoad, Actions } from './$types';
import { getNetwork, removeNetwork } from '$lib/services/docker/network-service';
import { error, fail, redirect } from '@sveltejs/kit';
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';

export const load: PageServerLoad = async ({ params }) => {
	const networkId = params.networkId;

	try {
		const network = await getNetwork(networkId);

		return {
			network
		};
	} catch (err: unknown) {
		console.error(`Failed to load network ${networkId}:`, err);
		if (err instanceof NotFoundError) {
			error(404, { message: err.message });
		} else {
			const statusCode = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 500;
			error(statusCode, {
				message: err instanceof Error ? err.message : `Failed to load network details for "${networkId}".`
			});
		}
	}
};

export const actions: Actions = {
	remove: async ({ params }) => {
		const networkId = params.networkId;
		try {
			await removeNetwork(networkId);
			redirect(303, '/networks');
		} catch (err: unknown) {
			console.error(`Failed to remove network ${networkId}:`, err);
			if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof DockerApiError) {
				return fail('status' in err ? err.status : 500, { error: err.message });
			}
			return fail(500, { error: err instanceof Error ? err.message : 'An unexpected error occurred during removal.' });
		}
	}
};
