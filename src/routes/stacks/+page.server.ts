import { error } from '@sveltejs/kit';
import { loadComposeStacks, discoverExternalStacks } from '$lib/services/docker/stack-service';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	try {
		// Get managed stacks
		const managedStacks = await loadComposeStacks();

		// Discover external stacks
		const externalStacks = await discoverExternalStacks();

		// Combine both, ensuring no duplicates by ID
		const combinedStacks = [...managedStacks];

		for (const externalStack of externalStacks) {
			if (!combinedStacks.some((stack) => stack.id === externalStack.id)) {
				combinedStacks.push(externalStack);
			}
		}

		return {
			stacks: combinedStacks
		};
	} catch (err) {
		console.error('Failed to load stacks:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return {
			stacks: [],
			error: 'Failed to load Docker Compose stacks: ' + errorMessage
		};
	}
}
