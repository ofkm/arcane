import type { Icon as IconType } from '@lucide/svelte';
import PaletteIcon from '@lucide/svelte/icons/palette';
import FileStackIcon from '@lucide/svelte/icons/file-stack';
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
import HouseIcon from '@lucide/svelte/icons/home';
import NetworkIcon from '@lucide/svelte/icons/network';
import ContainerIcon from '@lucide/svelte/icons/container';
import ImageIcon from '@lucide/svelte/icons/image';
import SettingsIcon from '@lucide/svelte/icons/settings';
import DatabaseIcon from '@lucide/svelte/icons/database';
import LayoutTemplateIcon from '@lucide/svelte/icons/layout-template';
import UserIcon from '@lucide/svelte/icons/user';
import ShieldIcon from '@lucide/svelte/icons/shield';
import ComputerIcon from '@lucide/svelte/icons/computer';
import LockKeyholeIcon from '@lucide/svelte/icons/lock-keyhole';
import AlarmClockIcon from '@lucide/svelte/icons/alarm-clock';
import NavigationIcon from '@lucide/svelte/icons/navigation';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import { m } from '$lib/paraglide/messages';

// Get base path from build config
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

// Helper to create paths with base
const p = (path: string) => `${basePath}${path}`;

export type NavigationItem = {
	title: string;
	url: string;
	icon: typeof IconType;
	items?: NavigationItem[];
};

export const navigationItems: Record<string, NavigationItem[]> = {
	managementItems: [
		{ title: m.dashboard_title(), url: p('/dashboard'), icon: HouseIcon },
		{ title: m.containers_title(), url: p('/containers'), icon: ContainerIcon },
		{ title: m.projects_title(), url: p('/projects'), icon: FileStackIcon },
		{ title: m.images_title(), url: p('/images'), icon: ImageIcon },
		{ title: m.networks_title(), url: p('/networks'), icon: NetworkIcon },
		{ title: m.volumes_title(), url: p('/volumes'), icon: HardDriveIcon }
	],
	customizationItems: [
		{
			title: m.customize_title(),
			url: p('/customize'),
			icon: PaletteIcon,
			items: [
				{ title: m.templates_title(), url: p('/customize/templates'), icon: LayoutTemplateIcon },
				{ title: m.registries_title(), url: p('/customize/registries'), icon: LockKeyholeIcon },
				{ title: m.variables_title(), url: p('/customize/variables'), icon: FileTextIcon }
			]
		}
	],
	environmentItems: [
		{
			title: m.environments_title(),
			url: p('/environments'),
			icon: ComputerIcon
		}
	],
	settingsItems: [
		{
			title: m.events_title(),
			url: p('/events'),
			icon: AlarmClockIcon
		},
		{
			title: m.settings_title(),
			url: p('/settings'),
			icon: SettingsIcon,
			items: [
				{ title: m.general_title(), url: p('/settings/general'), icon: SettingsIcon },
				{ title: m.docker_title(), url: p('/settings/docker'), icon: DatabaseIcon },
				{ title: m.security_title(), url: p('/settings/security'), icon: ShieldIcon },
				{ title: m.navigation_title(), url: p('/settings/navigation'), icon: NavigationIcon },
				{ title: m.users_title(), url: p('/settings/users'), icon: UserIcon }
			]
		}
	]
};

export const defaultMobilePinnedItems: NavigationItem[] = [
	navigationItems.managementItems[0],
	navigationItems.managementItems[1],
	navigationItems.managementItems[3],
	navigationItems.managementItems[5]
];

export type MobileNavigationSettings = {
	pinnedItems: string[];
	mode: 'floating' | 'docked';
	showLabels: boolean;
	scrollToHide: boolean;
};

export function getAvailableMobileNavItems(): NavigationItem[] {
	const flatItems: NavigationItem[] = [];

	flatItems.push(...navigationItems.managementItems);
	// Flatten customization children so individual pages can be pinned/selected
	for (const item of navigationItems.customizationItems) {
		if (item.items && item.items.length > 0) {
			flatItems.push(...item.items);
		} else {
			flatItems.push(item);
		}
	}

	if (navigationItems.environmentItems) {
		flatItems.push(...navigationItems.environmentItems);
	}
	if (navigationItems.settingsItems) {
		const settingsTopLevel = navigationItems.settingsItems.filter((item) => !item.items);
		flatItems.push(...settingsTopLevel);
	}

	return flatItems;
}

export const defaultMobileNavigationSettings: MobileNavigationSettings = {
	pinnedItems: defaultMobilePinnedItems.map((item) => item.url),
	mode: 'floating',
	showLabels: true,
	scrollToHide: true
};
