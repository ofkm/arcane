import type { Icon as IconType } from '@lucide/svelte';
import {
	FileStack,
	HardDrive,
	Home,
	Network,
	Container,
	ImageIcon,
	SettingsIcon,
	DatabaseIcon,
	LayoutTemplate,
	UserIcon,
	Shield,
	ComputerIcon,
	LockKeyholeIcon,
	LucideAlarmClock
} from '@lucide/svelte';

export type SidebarItem = {
	title: string;
	url: string;
	icon: typeof IconType;
	items?: SidebarItem[];
};

export const sidebarItems: Record<string, SidebarItem[]> = {
	managementItems: [
		{ title: 'Dashboard', url: '/dashboard', icon: Home },
		{ title: 'Containers', url: '/containers', icon: Container },
		{ title: 'Projects', url: '/compose', icon: FileStack },
		{ title: 'Images', url: '/images', icon: ImageIcon },
		{ title: 'Networks', url: '/networks', icon: Network },
		{ title: 'Volumes', url: '/volumes', icon: HardDrive }
	],
	customizationItems: [
		{
			title: 'Templates',
			url: '/customize/templates',
			icon: LayoutTemplate
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
			title: 'Settings',
			url: '/settings',
			icon: SettingsIcon,
			items: [
				{ title: 'General', url: '/settings/general', icon: SettingsIcon },
				{ title: 'Docker', url: '/settings/docker', icon: DatabaseIcon },
				{ title: 'Events', url: '/settings/events', icon: LucideAlarmClock },
				{ title: 'Users', url: '/settings/users', icon: UserIcon },
				{ title: 'Security', url: '/settings/security', icon: Shield }
			]
		}
	]
};
