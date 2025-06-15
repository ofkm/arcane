<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';
	import ServerIcon from '@lucide/svelte/icons/server';
	import type { Agent } from '$lib/types/agent.type';

	// Extend the Agent type to include isLocal for the local Docker option
	type ExtendedAgent = Agent & { isLocal?: boolean };

	let { agents, hasLocalDocker = false }: { agents: Agent[]; hasLocalDocker?: boolean } = $props();
	const sidebar = useSidebar();

	const localDockerAgent: ExtendedAgent = {
		id: 'local',
		hostname: 'Local Docker',
		platform: 'local',
		version: 'N/A',
		capabilities: [],
		status: 'online' as const,
		lastSeen: new Date().toISOString(),
		registeredAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		isLocal: true
	};

	const allAgents: ExtendedAgent[] = $derived(hasLocalDocker ? [localDockerAgent, ...agents] : agents);
	let activeAgent = $derived(allAgents[0]);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton {...props} size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
						<div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
							{#if activeAgent?.isLocal}
								<ServerIcon class="size-4" />
							{:else}
								<GalleryVerticalEndIcon class="size-4" />
							{/if}
						</div>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">
								{activeAgent?.hostname}
							</span>
							<span class="truncate text-xs">
								{activeAgent?.isLocal ? 'Local Socket' : activeAgent?.id}
							</span>
						</div>
						<ChevronsUpDownIcon class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg" align="start" side={sidebar.isMobile ? 'bottom' : 'right'} sideOffset={4}>
				<DropdownMenu.Label class="text-muted-foreground text-xs">Docker Instances</DropdownMenu.Label>
				{#each allAgents as agent, index (agent.id)}
					<DropdownMenu.Item onSelect={() => (activeAgent = agent)} class="gap-2 p-2">
						<div class="flex size-6 items-center justify-center rounded-md border">
							{#if agent.isLocal}
								<ServerIcon class="size-3.5 shrink-0" />
							{:else}
								<GalleryVerticalEndIcon class="size-3.5 shrink-0" />
							{/if}
						</div>
						<div class="flex flex-col">
							<span>{agent.hostname}</span>
							{#if agent.isLocal}
								<span class="text-muted-foreground text-xs">Local Socket</span>
							{/if}
						</div>
						<DropdownMenu.Shortcut>⌘{index + 1}</DropdownMenu.Shortcut>
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2 p-2">
					<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
						<PlusIcon class="size-4" />
					</div>
					<div class="text-muted-foreground font-medium">Add Agent</div>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
