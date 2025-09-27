import type { Icon as IconType } from '@lucide/svelte';
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
import { m } from '$lib/paraglide/messages';

export type NavigationItem = {
	title: string;
	url: string;
	icon: typeof IconType;
	items?: NavigationItem[];
};

export const navigationItems: Record<string, NavigationItem[]> = {
	managementItems: [
		{ title: m.dashboard_title(), url: '/dashboard', icon: HouseIcon },
		{ title: m.containers_title(), url: '/containers', icon: ContainerIcon },
		{ title: m.projects_title(), url: '/projects', icon: FileStackIcon },
		{ title: m.images_title(), url: '/images', icon: ImageIcon },
		{ title: m.networks_title(), url: '/networks', icon: NetworkIcon },
		{ title: m.volumes_title(), url: '/volumes', icon: HardDriveIcon }
	],
	customizationItems: [
		{
			title: m.templates_title(),
			url: '/customize/templates',
			icon: LayoutTemplateIcon
		},
		{
			title: m.registries_title(),
			url: '/customize/registries',
			icon: LockKeyholeIcon
		}
	],
	environmentItems: [
		{
			title: m.environments_title(),
			url: '/environments',
			icon: ComputerIcon
		}
	],
	settingsItems: [
		{
			title: m.events_title(),
			url: '/events',
			icon: AlarmClockIcon
		},
		{
			title: m.sidebar_settings(),
			url: '/settings',
			icon: SettingsIcon,
			items: [
				{ title: m.general_title(), url: '/settings/general', icon: SettingsIcon },
				{ title: m.docker_title(), url: '/settings/docker', icon: DatabaseIcon },
				{ title: m.security_title(), url: '/settings/security', icon: ShieldIcon },
				{ title: m.navigation_title(), url: '/settings/navigation', icon: NavigationIcon },
				{ title: m.users_title(), url: '/settings/users', icon: UserIcon }
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
	tapToHide: boolean;
};

export function getAvailableMobileNavItems(): NavigationItem[] {
	const flatItems: NavigationItem[] = [];

	flatItems.push(...navigationItems.managementItems);
	flatItems.push(...navigationItems.customizationItems);

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
	scrollToHide: true,
	tapToHide: false
};
