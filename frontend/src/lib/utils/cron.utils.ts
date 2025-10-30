import { m } from '$lib/paraglide/messages';
import type { Component } from 'svelte';
import ZapIcon from '@lucide/svelte/icons/zap';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import BriefcaseIcon from '@lucide/svelte/icons/briefcase';
import MoonIcon from '@lucide/svelte/icons/moon';
import SunriseIcon from '@lucide/svelte/icons/sunrise';
import ClockIcon from '@lucide/svelte/icons/clock';

export interface CronPreset {
	value: string | null;
	label: string;
	description: string;
	icon?: Component;
}

/**
 * Common cron schedule presets
 */
export const commonCronPresets: CronPreset[] = [
	{
		value: null,
		label: m.cron_immediate(),
		description: m.cron_immediate_description(),
		icon: ZapIcon
	},
	{
		value: '0 2 * * 6,0',
		label: m.cron_weekends_at({ hour: '2am' }),
		description: m.cron_weekends_at({ hour: '2am' }),
		icon: CalendarIcon
	},
	{
		value: '0 3 * * 1-5',
		label: m.cron_weekdays_at({ hour: '3am' }),
		description: m.cron_weekdays_at({ hour: '3am' }),
		icon: BriefcaseIcon
	},
	{
		value: '0 0 * * *',
		label: m.cron_daily_at({ time: 'midnight' }),
		description: m.cron_daily_at({ time: 'midnight' }),
		icon: MoonIcon
	},
	{
		value: '0 2 * * *',
		label: m.cron_daily_at({ time: '2am' }),
		description: m.cron_daily_at({ time: '2am' }),
		icon: SunriseIcon
	},
	{
		value: '0 */6 * * *',
		label: m.cron_every_n_hours({ hours: '6' }),
		description: m.cron_every_n_hours({ hours: '6' }),
		icon: ClockIcon
	},
	{
		value: '0 */12 * * *',
		label: m.cron_every_n_hours({ hours: '12' }),
		description: m.cron_every_n_hours({ hours: '12' }),
		icon: ClockIcon
	}
];

/**
 * Basic client-side validation for cron expressions
 */
export function validateCronExpression(expr: string): { valid: boolean; error?: string } {
	if (!expr || expr.trim() === '') {
		return { valid: true }; // Empty is valid (immediate mode)
	}

	const parts = expr.trim().split(/\s+/);
	
	// Standard cron has 5 fields: minute hour day month weekday
	if (parts.length !== 5) {
		return {
			valid: false,
			error: m.cron_invalid()
		};
	}

	return { valid: true };
}

/**
 * Convert cron expression to human-readable text with i18n support
 */
export function cronToHumanReadable(expr: string | null): string {
	if (!expr || expr.trim() === '') {
		return m.cron_immediate();
	}

	const normalized = expr.trim();

	// Check against known presets
	const preset = commonCronPresets.find((p) => p.value === normalized);
	if (preset) {
		return preset.label;
	}

	// Try to parse common patterns
	const parts = normalized.split(/\s+/);
	if (parts.length !== 5) {
		return normalized; // Fallback to showing the expression
	}

	const [minute, hour, day, month, weekday] = parts;

	// Pattern: Weekends at specific time (e.g., "0 2 * * 6,0")
	if (day === '*' && month === '*' && (weekday === '6,0' || weekday === '0,6')) {
		const hourNum = parseInt(hour);
		if (!isNaN(hourNum) && minute === '0') {
			const time = formatHour(hourNum);
			return m.cron_weekends_at({ hour: time });
		}
	}

	// Pattern: Weekdays at specific time (e.g., "0 3 * * 1-5")
	if (day === '*' && month === '*' && weekday === '1-5') {
		const hourNum = parseInt(hour);
		if (!isNaN(hourNum) && minute === '0') {
			const time = formatHour(hourNum);
			return m.cron_weekdays_at({ hour: time });
		}
	}

	// Pattern: Daily at specific time (e.g., "0 2 * * *")
	if (day === '*' && month === '*' && weekday === '*') {
		const hourNum = parseInt(hour);
		if (!isNaN(hourNum) && minute === '0') {
			const time = formatHour(hourNum);
			return m.cron_daily_at({ time });
		}
	}

	// Pattern: Every N hours (e.g., "0 */6 * * *")
	if (day === '*' && month === '*' && weekday === '*' && minute === '0' && hour.startsWith('*/')) {
		const hours = hour.substring(2);
		return m.cron_every_n_hours({ hours });
	}

	// Fallback: return the expression itself
	return normalized;
}

/**
 * Format hour number to human-readable time
 */
function formatHour(hour: number): string {
	if (hour === 0) return 'midnight';
	if (hour === 12) return 'noon';
	if (hour < 12) return `${hour}am`;
	return `${hour - 12}pm`;
}
