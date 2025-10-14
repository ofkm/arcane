import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
import BadgeXIcon from '@lucide/svelte/icons/badge-x';
import CircleFadingArrowUp from '@lucide/svelte/icons/circle-fading-arrow-up';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import InfoIcon from '@lucide/svelte/icons/info';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import GlobeIcon from '@lucide/svelte/icons/globe';
import { m } from '$lib/paraglide/messages';

export const usageFilters = [
	{
		value: true,
		label: m.common_in_use(),
		icon: BadgeCheckIcon
	},
	{
		value: false,
		label: m.common_unused(),
		icon: CircleCheck
	}
];

export const imageUpdateFilters = [
	{
		value: true,
		label: m.images_has_updates(),
		icon: CircleFadingArrowUp
	},
	{
		value: false,
		label: m.images_no_updates(),
		icon: BadgeXIcon
	}
];

export const severityFilters = [
	{
		value: 'info',
		label: m.events_info(),
		icon: InfoIcon
	},
	{
		value: 'success',
		label: m.events_success(),
		icon: CircleCheckIcon
	},
	{
		value: 'warning',
		label: m.events_warning(),
		icon: TriangleAlertIcon
	},
	{
		value: 'error',
		label: m.events_error(),
		icon: CircleXIcon
	}
];

export const templateTypeFilters = [
	{
		value: 'false',
		label: m.templates_local(),
		icon: FolderOpenIcon
	},
	{
		value: 'true',
		label: m.templates_remote(),
		icon: GlobeIcon
	}
];
