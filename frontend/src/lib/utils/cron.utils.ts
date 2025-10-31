import { m } from '$lib/paraglide/messages';
import type { Component } from 'svelte';
import { z } from 'zod/v4';
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
 * Zod schema for cron expressions
 * Basic 5-field cron validation (minute hour day month weekday)
 * Backend will perform more thorough validation
 */
export const cronExpressionSchema = z
	.string()
	.nullable()
	.default(null)
	.refine(
		(val) => {
			if (!val || val.trim() === '') return true; // Empty is valid (immediate)

			// Basic 5-part cron regex: minute hour day month weekday
			const cronRegex =
				/^(\*|[0-5]?\d|[0-5]?\d-[0-5]?\d|[0-5]?\d\/[0-5]?\d|\*\/[0-5]?\d|[0-5]?\d(,[0-5]?\d)+)\s+(\*|[01]?\d|2[0-3]|[01]?\d-[01]?\d|[01]?\d\/[01]?\d|\*\/[01]?\d|[01]?\d(,[01]?\d)+)\s+(\*|[1-9]|[12]\d|3[01]|[1-9]-[1-9]|[1-9]\/[1-9]|\*\/[1-9]|[1-9](,[1-9])+)\s+(\*|[1-9]|1[0-2]|[1-9]-[1-9]|[1-9]\/[1-9]|\*\/[1-9]|[1-9](,[1-9])+)\s+(\*|[0-6]|[0-6]-[0-6]|[0-6]\/[0-6]|\*\/[0-6]|[0-6](,[0-6])+)$/;

			return cronRegex.test(val.trim());
		},
		{
			message: 'Invalid cron expression format. Expected 5 fields: minute hour day month weekday'
		}
	);

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

	// Return expression as-is (backend will validate)
	return normalized;
}
