import { loadComposeStacks, discoverExternalStacks } from '$lib/services/docker/stack-service';
import type { PageServerLoad } from './$types';
import { tryCatch } from '$lib/utils/try-catch';

export const load: PageServerLoad = async () => {
	const managedResult = await tryCatch(loadComposeStacks());
	const externalResult = await tryCatch(discoverExternalStacks());

	if (managedResult.error || externalResult.error) {
		console.error('Failed to load stacks:', managedResult.error || externalResult.error);
		const errorMessage = (managedResult.error?.message || externalResult.error?.message) ?? 'Unknown error';
		return {
			stacks: [],
			error: 'Failed to load Docker Compose stacks: ' + errorMessage
		};
	}

	const managedStacks = managedResult.data;
	const externalStacks = externalResult.data;
	const combinedStacks = [...managedStacks];

	for (const externalStack of externalStacks) {
		if (!combinedStacks.some((stack) => stack.id === externalStack.id)) {
			combinedStacks.push(externalStack);
		}
	}

	return {
		stacks: combinedStacks
	};
};
