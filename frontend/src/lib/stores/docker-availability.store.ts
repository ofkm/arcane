import { writable } from 'svelte/store';

export const dockerAvailability = writable<boolean | null>(null);
