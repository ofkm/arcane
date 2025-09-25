import { settingsService } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';
import { writable } from 'svelte/store';

const settingsStore = writable<Settings>();

const reload = async () => {
	const settings = await settingsService.getSettings();
	settingsStore.set(settings);
};

const set = (settings: Settings) => {
	settingsStore.set(settings);
};

export default {
	subscribe: settingsStore.subscribe,
	reload,
	set
};
