import type { Icon as IconType } from '@lucide/svelte';

export interface TabItem {
	value: string;
	label: string;
	icon?: typeof IconType;
	badge?: string | number;
	disabled?: boolean;
	class?: string;
}
