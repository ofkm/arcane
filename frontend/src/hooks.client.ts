import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

const initHandler: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	return resolve(event);
};

export const handle = sequence(initHandler);
