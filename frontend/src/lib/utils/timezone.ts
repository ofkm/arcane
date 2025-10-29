import { settingsService } from '$lib/services/settings-service';
import type { TimezoneOption } from '$lib/types/timezone.type';

export type { TimezoneOption };

let cachedTimezones: TimezoneOption[] | null = null;
let commonTimezones: string[] = [];

export async function getAllTimezones(): Promise<TimezoneOption[]> {
	if (cachedTimezones) {
		return cachedTimezones;
	}

	try {
		const response = await settingsService.getTimezones();
		cachedTimezones = response.timezones;
		commonTimezones = response.common;
		return response.timezones;
	} catch (error) {
		console.error('Failed to fetch timezones from backend:', error);
		return [];
	}
}

export async function getCommonTimezones(): Promise<TimezoneOption[]> {
	const allZones = await getAllTimezones();

	if (commonTimezones.length > 0) {
		const preferred = new Set(commonTimezones);
		return allZones.filter((tz) => preferred.has(tz.value));
	}

	return allZones.slice(0, 20);
}

export async function searchTimezones(query: string): Promise<TimezoneOption[]> {
	const allTimezones = await getAllTimezones();

	if (!query || query.trim() === '') {
		return getCommonTimezones();
	}

	const lowerQuery = query.toLowerCase();
	const filtered = allTimezones.filter((tz) => tz.value.toLowerCase().includes(lowerQuery));

	return filtered.slice(0, 100);
}
