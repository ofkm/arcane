import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeNetwork } from '$lib/services/docker/network-service';

export const DELETE: RequestHandler = async ({ params }) => {
	const networkId = params.id;

	if (!networkId) {
		throw error(400, 'Network ID is required');
	}

	try {
		await removeNetwork(networkId);
		return json({ success: true, message: `Network ${networkId} deleted.` });
	} catch (err: any) {
		console.error(`API Error removing network ${networkId}:`, err);
		// Pass specific error messages from the service
		if (err.message.includes('not found')) {
			throw error(404, err.message);
		}
		if (err.message.includes('cannot be removed')) {
			throw error(409, err.message); // 409 Conflict
		}
		throw error(500, err.message || 'Failed to remove network');
	}
};
