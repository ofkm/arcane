import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import type { Environment } from '$lib/stores/environment.store';

export function getApiPath(basePath: string): string {
	const activeEnvironment = get(environmentStore.selected);

	if (activeEnvironment && activeEnvironment.id !== LOCAL_DOCKER_ENVIRONMENT_ID && !activeEnvironment.isLocal) {
		// Ensure basePath starts with a slash for proxying
		const pathSegment = basePath.startsWith('/') ? basePath : `/${basePath}`;
		return `/agents/${activeEnvironment.id}/proxy${pathSegment}`;
	}
	// Ensure /api prefix for local and basePath starts with a slash
	const pathSegment = basePath.startsWith('/') ? basePath : `/${basePath}`;
	return `${pathSegment}`;
}
