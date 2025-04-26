import { initComposeService } from '$lib/services/docker/stack-service';

// Initialize needed services
initComposeService().catch((err) => {
	console.error('Failed to initialize compose service:', err);
});

export async function handle({ event, resolve }) {
	return await resolve(event);
}
