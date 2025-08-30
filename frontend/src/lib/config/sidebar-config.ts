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

export type SidebarItem = {
	title: string;
	url: string;
	icon: typeof IconType;
	items?: SidebarItem[];
};

export const sidebarItems: Record<string, SidebarItem[]> = {
	managementItems: [
		{ title: 'Dashboard', url: '/dashboard', icon: HouseIcon },
		{ title: 'Containers', url: '/containers', icon: ContainerIcon },
		{ title: 'Projects', url: '/compose', icon: FileStackIcon },
		{ title: 'Images', url: '/images', icon: ImageIcon },
		{ title: 'Networks', url: '/networks', icon: NetworkIcon },
		{ title: 'Volumes', url: '/volumes', icon: HardDriveIcon }
	],
	customizationItems: [
		{
			title: 'Templates',
			url: '/customize/templates',
			icon: LayoutTemplateIcon
		},
		{
			title: 'Container Registries',
			url: '/customize/registries',
			icon: LockKeyholeIcon
		}
	],
	environmentItems: [
		{
			title: 'Environments',
			url: '/environments',
			icon: ComputerIcon
		}
	],
	settingsItems: [
		{
			title: 'Events',
			url: '/events',
			icon: AlarmClockIcon
		},
		{
			title: 'Settings',
			url: '/settings',
			icon: SettingsIcon,
			items: [
				{ title: 'General', url: '/settings/general', icon: SettingsIcon },
				{ title: 'Docker', url: '/settings/docker', icon: DatabaseIcon },
				{ title: 'Users', url: '/settings/users', icon: UserIcon },
				{ title: 'Security', url: '/settings/security', icon: ShieldIcon }
			]
		}
	]
};
