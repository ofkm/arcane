import type { UpdateScheduleWindow } from '$lib/types/settings.type';
import { m } from '$lib/paraglide/messages';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Formats an array of days into a compact string representation for display
 * This is pure UI formatting - no business logic
 */
export function formatDays(days: DayOfWeek[]): string {
	if (days.length === 0) return '';
	if (days.length === 7) return m.all_days();

	// Sort days by their order in the week
	const sortedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

	// Check if days form a continuous range
	const indices = sortedDays.map((day) => dayOrder.indexOf(day));
	const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);

	// Get translated day abbreviations
	const dayAbbreviations: Record<DayOfWeek, string> = {
		monday: m.day_monday_short(),
		tuesday: m.day_tuesday_short(),
		wednesday: m.day_wednesday_short(),
		thursday: m.day_thursday_short(),
		friday: m.day_friday_short(),
		saturday: m.day_saturday_short(),
		sunday: m.day_sunday_short()
	};

	if (isConsecutive && sortedDays.length > 2) {
		// Format as range: Mon-Fri
		return `${dayAbbreviations[sortedDays[0]]}-${dayAbbreviations[sortedDays[sortedDays.length - 1]]}`;
	}

	// Format as comma-separated list: Mon, Wed, Fri
	return sortedDays.map((day) => dayAbbreviations[day]).join(', ');
}

/**
 * Formats a schedule window into a compact summary string for display
 * Example: "Mon-Fri 02:00-06:00 UTC"
 */
export function formatScheduleWindow(window: UpdateScheduleWindow): string {
	const daysStr = formatDays(window.days);
	const timeStr = `${window.startTime}-${window.endTime}`;
	const timezoneStr = window.timezone;

	return `${daysStr} ${timeStr} ${timezoneStr}`;
}
