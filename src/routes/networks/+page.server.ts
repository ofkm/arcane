import type { PageServerLoad } from './$types';
import { listNetworks } from '$lib/services/docker/network-service';
import type { ServiceNetwork } from '$lib/types/docker';

// Define the shape of the data returned by the load function
type NetworkPageData = {
	networks: ServiceNetwork[];
	error?: string;
};

export const load: PageServerLoad = async (): Promise<NetworkPageData> => {
	try {
		// Actually call the function to list networks
		const networks = await listNetworks();
		return {
			networks
		};
	} catch (err: any) {
		console.error('Failed to load networks:', err);
		// Return an empty array and the error message
		return {
			networks: [],
			error: err.message || 'Failed to connect to Docker or list networks.'
		};
	}
};
