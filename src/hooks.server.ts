import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';

// Initialize needed services
try {
	await Promise.all([initComposeService(), initAutoUpdateScheduler()]);
} catch (err) {
	console.error('Critical service init failed, exiting:', err);
	process.exit(1);
}

export async function handle({ event, resolve }) {
	return await resolve(event);
}
