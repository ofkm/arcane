import { environmentAPI } from '$lib/services/api';

export const load = async () => {
	try {
		// Load managed stacks
		const response = await environmentAPI.getStacks();

		// Extract stacks from the API response structure
		const stacks = response || [];

		return {
			stacks,
			error: null
		};
	} catch (error) {
		console.error('Failed to load compose page:', error);
		return {
			stacks: [],
			error: error instanceof Error ? error.message : 'Failed to load Docker Compose stacks'
		};
	}
};
