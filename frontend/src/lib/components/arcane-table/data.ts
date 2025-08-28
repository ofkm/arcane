import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
import BadgeXIcon from '@lucide/svelte/icons/badge-x';
import CircleFadingArrowUp from '@lucide/svelte/icons/circle-fading-arrow-up';
import CircleCheck from '@lucide/svelte/icons/circle-check';

export const labels = [
	{
		value: 'bug',
		label: 'Bug'
	},
	{
		value: 'feature',
		label: 'Feature'
	},
	{
		value: 'documentation',
		label: 'Documentation'
	}
];

export const usageFilters = [
	{
		value: true,
		label: 'In Use',
		icon: BadgeCheckIcon
	},
	{
		value: false,
		label: 'Unused',
		icon: CircleCheck
	}
];

export const imageUpdateFilters = [
	{
		value: true,
		label: 'Has Updates',
		icon: CircleFadingArrowUp
	},
	{
		value: false,
		label: 'No Updates',
		icon: BadgeXIcon
	}
];

export const priorities = [
	{
		label: 'Low',
		value: 'low',
		icon: ArrowDownIcon
	},
	{
		label: 'Medium',
		value: 'medium',
		icon: ArrowRightIcon
	},
	{
		label: 'High',
		value: 'high',
		icon: ArrowUpIcon
	}
];
