import { initComposeService } from "$lib/services/compose";

// Initialize needed services
initComposeService().catch((err) => {
  console.error("Failed to initialize compose service:", err);
});

export async function handle({ event, resolve }) {
  return await resolve(event);
}
