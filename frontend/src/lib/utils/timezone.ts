import { Info, DateTime } from 'luxon';

export interface TimezoneOption {
	value: string;
	label: string;
	offset: string;
}

let cachedTimezones: TimezoneOption[] | null = null;

export function isValidTimezone(timezone: string): boolean {
	return Info.isValidIANAZone(timezone);
}

function getTimezoneOffset(tz: string): string {
	try {
		const dt = DateTime.now().setZone(tz);
		if (!dt.isValid) return '';

		const offsetMinutes = dt.offset;
		const hours = Math.floor(Math.abs(offsetMinutes) / 60);
		const minutes = Math.abs(offsetMinutes) % 60;
		const sign = offsetMinutes >= 0 ? '+' : '-';

		return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	} catch {
		return '';
	}
}

export function getAllTimezones(): TimezoneOption[] {
	if (cachedTimezones) {
		return cachedTimezones;
	}

	try {
		if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
			const zones = (Intl as any).supportedValuesOf('timeZone') as string[];
			cachedTimezones = zones
				.filter((tz) => Info.isValidIANAZone(tz))
				.sort()
				.map((tz) => ({
					value: tz,
					label: tz,
					offset: getTimezoneOffset(tz)
				}));
			return cachedTimezones;
		}
	} catch (error) {
		console.warn('Intl.supportedValuesOf not available, using fallback list');
	}

	return [];
}

export function getCommonTimezones(): TimezoneOption[] {
	const allZones = getAllTimezones();

	const majorCities = [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'Europe/London',
		'Europe/Paris',
		'Asia/Tokyo',
		'Asia/Shanghai',
		'Australia/Sydney'
	];

	const preferred = new Set(majorCities);

	const common = allZones.filter((tz) => preferred.has(tz.value));

	if (common.length > 0) {
		return common;
	}

	return allZones.slice(0, 20);
}

export function searchTimezones(query: string): TimezoneOption[] {
	const allTimezones = getAllTimezones();

	if (!query || query.trim() === '') {
		return getCommonTimezones();
	}

	const lowerQuery = query.toLowerCase();
	const filtered = allTimezones.filter((tz) => tz.value.toLowerCase().includes(lowerQuery));

	return filtered.slice(0, 100);
}
