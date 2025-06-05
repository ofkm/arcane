import type { PageLoad } from './$types';
import { networkAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const networkId = params.networkId;

	try {
		const network = await networkAPI.get(networkId);

		return {
			network
		};
	} catch (err: any) {
		console.error(`Failed to load network ${networkId}:`, err);

		// Handle API errors
		if (err.status === 404 || err.name === 'NotFoundError') {
			error(404, {
				message: err.message || `Network with ID "${networkId}" not found.`
			});
		} else {
			error(err.status || 500, {
				message: err.message || `Failed to load network details for "${networkId}".`
			});
		}
	}
};
