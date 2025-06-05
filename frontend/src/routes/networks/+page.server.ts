import type { PageServerLoad } from './$types';
import { listNetworks } from '$lib/services/docker/network-service';
import type { NetworkInspectInfo } from 'dockerode';

type NetworkPageData = {
	networks: NetworkInspectInfo[];
	error?: string;
};

export const load: PageServerLoad = async (): Promise<NetworkPageData> => {
	try {
		const networks = await listNetworks();
		return {
			networks
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
