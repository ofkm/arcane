import type { UpdateScheduleWindow } from '$lib/types/settings.type';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dayAbbreviations: Record<DayOfWeek, string> = {
	monday: 'Mon',
	tuesday: 'Tue',
	wednesday: 'Wed',
	thursday: 'Thu',
	friday: 'Fri',
	saturday: 'Sat',
	sunday: 'Sun'
};

/**
 * Formats an array of days into a compact string representation
 * Examples:
 * - ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] => "Mon-Fri"
 * - ['saturday', 'sunday'] => "Sat-Sun"
 * - ['monday', 'wednesday', 'friday'] => "Mon, Wed, Fri"
 */
export function formatDays(days: DayOfWeek[]): string {
	if (days.length === 0) return '';
	if (days.length === 7) return 'Every day';

	// Sort days by their order in the week
	const sortedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

	// Check if days form a continuous range
	const indices = sortedDays.map((day) => dayOrder.indexOf(day));
	const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);

	if (isConsecutive && sortedDays.length > 2) {
		// Format as range: Mon-Fri
		return `${dayAbbreviations[sortedDays[0]]}-${dayAbbreviations[sortedDays[sortedDays.length - 1]]}`;
	}

	// Format as comma-separated list: Mon, Wed, Fri
	return sortedDays.map((day) => dayAbbreviations[day]).join(', ');
}

/**
 * Formats a schedule window into a compact summary string
 * Example: "Mon-Fri 02:00-06:00 UTC"
 */
export function formatScheduleWindow(window: UpdateScheduleWindow): string {
	const daysStr = formatDays(window.days);
	const timeStr = `${window.startTime}-${window.endTime}`;
	const timezoneStr = window.timezone;

	return `${daysStr} ${timeStr} ${timezoneStr}`;
}

/**
 * Gets a short timezone abbreviation for display
 * Falls back to the full timezone name if no abbreviation is available
 */
export function getTimezoneAbbreviation(timezone: string): string {
	// Common timezone abbreviations
	const abbreviations: Record<string, string> = {
		UTC: 'UTC',
		'America/New_York': 'EST/EDT',
		'America/Chicago': 'CST/CDT',
		'America/Denver': 'MST/MDT',
		'America/Los_Angeles': 'PST/PDT',
		'Europe/London': 'GMT/BST',
		'Europe/Paris': 'CET/CEST',
		'Asia/Tokyo': 'JST',
		'Asia/Shanghai': 'CST',
		'Australia/Sydney': 'AEST/AEDT'
	};

	return abbreviations[timezone] || timezone;
}

