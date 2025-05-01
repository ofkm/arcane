import { loadComposeStacks, discoverExternalStacks } from '$lib/services/docker/stack-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const managedStacks = await loadComposeStacks();
		const externalStacks = await discoverExternalStacks();
		const combinedStacks = [...managedStacks];

		for (const externalStack of externalStacks) {
			if (!combinedStacks.some((stack) => stack.id === externalStack.id)) {
				combinedStacks.push(externalStack);
			}
		}

		return {
			stacks: combinedStacks
		};
	} catch (err: unknown) {
		console.error('Failed to load stacks:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return {
			stacks: [],
			error: 'Failed to load Docker Compose stacks: ' + errorMessage
		};
	}
};
