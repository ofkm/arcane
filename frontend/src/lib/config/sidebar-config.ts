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
import { m } from '$lib/paraglide/messages';

export type SidebarItem = {
	title: string;
	url: string;
	icon: typeof IconType;
	items?: SidebarItem[];
};

export const sidebarItems: Record<string, SidebarItem[]> = {
	managementItems: [
		{ title: m.dashboard_title(), url: '/dashboard', icon: HouseIcon },
		{ title: m.containers_title(), url: '/containers', icon: ContainerIcon },
		{ title: m.compose_title(), url: '/projects', icon: FileStackIcon },
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
				{ title: m.users_title(), url: '/settings/users', icon: UserIcon },
				{ title: m.security_title(), url: '/settings/security', icon: ShieldIcon }
			]
		}
	]
};
