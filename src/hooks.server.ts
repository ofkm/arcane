import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';

// Initialize needed services
Promise.all([
	initComposeService().catch((err) => {
		console.error('Failed to initialize compose service:', err);
	}),
	initAutoUpdateScheduler().catch((err) => {
		console.error('Failed to initialize auto-update scheduler:', err);
	})
]);

export async function handle({ event, resolve }) {
	return await resolve(event);
}
