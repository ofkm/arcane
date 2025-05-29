<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import HouseIcon from '@lucide/svelte/icons/house';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import UserIcon from '@lucide/svelte/icons/user';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import LayoutTemplateIcon from '@lucide/svelte/icons/layout-template';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import BoxIcon from '@lucide/svelte/icons/box';
	import FileStackIcon from '@lucide/svelte/icons/file-text';
	import ImageIcon from '@lucide/svelte/icons/image';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ComputerIcon from '@lucide/svelte/icons/computer';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { ChevronDown, Menu } from '@lucide/svelte';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	// Get sidebar context
	const sidebar = useSidebar();

	// Top level menu items
	const topItems = [
		{
			title: 'Dashboard',
			url: '/',
			icon: HouseIcon
		},
		{
			title: 'Agents',
			url: '/agents',
			icon: ComputerIcon
		},
		{
			title: 'Containers',
			url: '/containers',
			icon: BoxIcon
		},
		{
			title: 'Stacks',
			url: '/stacks',
			icon: FileStackIcon
		},
		{
			title: 'Images',
			url: '/images',
			icon: ImageIcon
		},
		{
			title: 'Networks',
			url: '/networks',
			icon: NetworkIcon
		},
		{
			title: 'Volumes',
			url: '/volumes',
			icon: HardDriveIcon
		}
	];

	// Settings submenu items
	const settingsItems = [
		{
			title: 'General',
			url: '/settings/general',
			icon: SettingsIcon
		},
		{
			title: 'Docker',
			url: '/settings/docker',
			icon: DatabaseIcon
		},
		{
			title: 'Templates',
			url: '/settings/templates',
			icon: LayoutTemplateIcon
		},
		{
			title: 'Users',
			url: '/settings/users',
			icon: UserIcon
		},
		{
			title: 'Security',
			url: '/settings/security',
			icon: ShieldIcon
		}
	];

	// State for collapsible sections
	let expandedSections = $state(new Set<string>());

	// Initialize from localStorage if available
	if (browser) {
		const savedExpanded = localStorage.getItem('expandedSections');
		if (savedExpanded) {
			try {
				expandedSections = new Set(JSON.parse(savedExpanded));
			} catch (e) {
				expandedSections = new Set();
			}
		}
	}

	// Toggle section expanded state
	function toggleSection(sectionName: string) {
		if (expandedSections.has(sectionName)) {
			expandedSections.delete(sectionName);
		} else {
			expandedSections.add(sectionName);
		}

		// Create new Set to trigger reactivity
		expandedSections = new Set(expandedSections);

		// Save to localStorage
		if (browser) {
			localStorage.setItem('expandedSections', JSON.stringify([...expandedSections]));
		}
	}

	// Helper to check if a menu item is active
	function isActive(url: string): boolean {
		return page.url.pathname === url || (url !== '/' && page.url.pathname.startsWith(url));
	}

	// Check if any setting item is active
	const hasActiveSettingsItem = $derived(settingsItems.some((item) => isActive(item.url)));

	// Auto-expand settings if a settings page is active
	$effect(() => {
		if (hasActiveSettingsItem && !expandedSections.has('Settings')) {
			expandedSections.add('Settings');
			expandedSections = new Set(expandedSections);
		}
	});
</script>

<Sidebar.Root variant="floating" collapsible="icon">
	<Sidebar.Content>
		<div class="flex items-center p-4 justify-between">
			<div class="flex items-center gap-3">
				<div class="flex flex-col">
					<span class="font-medium text-sm">Arcane</span>
					<span class="text-xs text-muted-foreground">Control Panel</span>
				</div>
			</div>
		</div>

		<Sidebar.Header>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuButton {...props}>
									Select Agent
									<ChevronDown class="ml-auto" />
								</Sidebar.MenuButton>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width)">
							<DropdownMenu.Item>
								<span>Local Socket</span>
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								<span>Acme Corp.</span>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Header>

		<!-- Main Navigation Menu -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each topItems as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton data-active={isActive(item.url)}>
								{#snippet child({ props })}
									<a href={item.url} {...props}>
										<item.icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<!-- Settings Menu with Collapsible -->
		<Collapsible.Root
			open={expandedSections.has('Settings') || hasActiveSettingsItem}
			onOpenChange={(open) => {
				if (open) {
					expandedSections.add('Settings');
				} else {
					expandedSections.delete('Settings');
				}
				expandedSections = new Set(expandedSections);
				if (browser) {
					localStorage.setItem('expandedSections', JSON.stringify([...expandedSections]));
				}
			}}
			class="group/collapsible"
		>
			<Sidebar.Group>
				<Sidebar.GroupLabel>
					{#snippet child({ props })}
						<Collapsible.Trigger {...props} class="w-full flex items-center">
							Settings
							<ChevronDown class="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
						</Collapsible.Trigger>
					{/snippet}
				</Sidebar.GroupLabel>
				<Collapsible.Content>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each settingsItems as item (item.title)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton data-active={isActive(item.url)}>
										{#snippet child({ props })}
											<a href={item.url} {...props}>
												<item.icon />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Collapsible.Content>
			</Sidebar.Group>
		</Collapsible.Root>
	</Sidebar.Content>
	<Sidebar.Rail />
</Sidebar.Root>
