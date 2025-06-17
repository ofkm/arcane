import type { PageLoad } from './$types';
import { environmentAPI } from '$lib/services/api';
import type { NetworkInspectInfo } from 'dockerode';

type NetworkPageData = {
	networks: NetworkInspectInfo[];
	error?: string;
};

export const load: PageLoad = async (): Promise<NetworkPageData> => {
	try {
		const networks = await environmentAPI.getNetworks();
		return {
			networks: Array.isArray(networks) ? networks : []
		};
	} catch (err: unknown) {
		console.error('Failed to load networks:', err);
		const message = err instanceof Error ? err.message : 'Failed to connect to Docker or list networks.';
		return {
			networks: [],
			error: message
		};
	}
};
