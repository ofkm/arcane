<script lang="ts" module>
	import { FileStack, HardDrive, Home, Network, Container, ImageIcon, SettingsIcon, DatabaseIcon, LayoutTemplate, UserIcon, Shield, ComputerIcon, LockKeyholeIcon } from '@lucide/svelte';

	const staticData = {
		settingsItems: [
			{
				title: 'Settings',
				url: '/settings',
				icon: SettingsIcon,
				items: [
					{ title: 'General', url: '/settings/general', icon: SettingsIcon },
					{ title: 'Docker', url: '/settings/docker', icon: DatabaseIcon },
					{ title: 'Users', url: '/settings/users', icon: UserIcon },
					{ title: 'Security', url: '/settings/security', icon: Shield },
					{ title: 'Agents (Preview)', url: '/agents', icon: ComputerIcon }
				]
			}
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
		managementItems: [
			{ title: 'Dashboard', url: '/', icon: Home },
			{ title: 'Containers', url: '/containers', icon: Container },
			{ title: 'Compose Projects', url: '/compose', icon: FileStack },
			{ title: 'Images', url: '/images', icon: ImageIcon },
			{ title: 'Networks', url: '/networks', icon: Network },
			{ title: 'Volumes', url: '/volumes', icon: HardDrive }
		]
	};
</script>

<script lang="ts">
	import SidebarItemGroup from './sidebar-itemgroup.svelte';
	import SidebarUser from './sidebar-user.svelte';
	import SidebarAgentSwitcher from './sidebar-agent-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import type { User } from '$lib/types/user.type';
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import SidebarLogo from './sidebar-logo.svelte';
	import SidebarUpdatebanner from './sidebar-updatebanner.svelte';
	import type { Agent } from '$lib/types/agent.type';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		user,
		versionInformation,
		hasLocalDocker,
		agents,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		versionInformation: AppVersionInformation;
		hasLocalDocker: boolean;
		user?: User | null;
		agents: Agent[];
	} = $props();

	const sidebar = useSidebar();

	const isCollapsed = $derived(sidebar.state === 'collapsed');
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<SidebarLogo {isCollapsed} {versionInformation} />
		<!-- Add back once we add in better agent switching -->
		<!-- <SidebarAgentSwitcher {hasLocalDocker} {agents} /> -->
	</Sidebar.Header>
	<Sidebar.Content>
		<SidebarItemGroup label="Management" items={staticData.managementItems} />
		<SidebarItemGroup label="Customization" items={staticData.customizationItems} />
		<SidebarItemGroup label="Administration" items={staticData.settingsItems} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<SidebarUpdatebanner {isCollapsed} {versionInformation} updateAvailable={versionInformation.updateAvailable} />
		{#if user}
			<SidebarUser {isCollapsed} {user} />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
