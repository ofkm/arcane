import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
import BadgeXIcon from '@lucide/svelte/icons/badge-x';
import CircleFadingArrowUp from '@lucide/svelte/icons/circle-fading-arrow-up';
import CircleCheck from '@lucide/svelte/icons/circle-check';

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
