import type { PageLoad } from './$types';
import { environmentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const { networkId } = params;

	try {
		const network = await environmentAPI.getNetwork(networkId);

		if (!network) {
			throw error(404, 'Network not found');
		}

		return {
			network
		};
	} catch (err: any) {
		console.error('Failed to load network:', err);
		if (err.status === 404) {
			throw err;
		}
		throw error(500, err.message || 'Failed to load network details');
	}
};
