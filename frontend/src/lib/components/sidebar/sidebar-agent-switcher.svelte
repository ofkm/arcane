<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';
	import ServerIcon from '@lucide/svelte/icons/server';
	import { environmentStore, type Environment } from '$lib/stores/environment.store';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	const sidebar = useSidebar();

	let currentSelectedEnvironment = $state<Environment | null>(null);
	let availableEnvironments = $state<Environment[]>([]);

	$effect(() => {
		const unsubscribeSelected = environmentStore.selected.subscribe((value) => {
			currentSelectedEnvironment = value;
		});
		const unsubscribeAvailable = environmentStore.available.subscribe((value) => {
			availableEnvironments = value;
		});
		return () => {
			unsubscribeSelected();
			unsubscribeAvailable();
		};
	});

	function handleSelect(env: Environment) {
		try {
			environmentStore.setEnvironment(env);
		} catch (error) {
			console.error('Failed to set environment:', error);
			toast.error('Failed to Connect to Environment');
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props: childProps })}
					<Sidebar.MenuButton {...childProps} size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
						{#if currentSelectedEnvironment}
							<div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								{#if currentSelectedEnvironment.isLocal}
									<ServerIcon class="size-4" />
								{:else}
									<GalleryVerticalEndIcon class="size-4" />
								{/if}
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">
									{currentSelectedEnvironment.hostname}
								</span>
								<span class="truncate text-xs">
									{currentSelectedEnvironment.isLocal ? 'Local Docker' : currentSelectedEnvironment.apiUrl}
								</span>
							</div>
						{:else}
							<div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								<ServerIcon class="size-4" />
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">No Environment</span>
								<span class="truncate text-xs">Select one</span>
							</div>
						{/if}
						<ChevronsUpDownIcon class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-[var(--bits-dropdown-menu-anchor-width)] min-w-56 rounded-lg" align="start" side={sidebar.isMobile ? 'bottom' : 'right'} sideOffset={4}>
				<DropdownMenu.Label class="text-muted-foreground text-xs">Select Environment</DropdownMenu.Label>
				{#if availableEnvironments.length === 0}
					<DropdownMenu.Item disabled class="gap-2 p-2">
						<div class="flex size-6 items-center justify-center rounded-md border">
							<ServerIcon class="size-3.5 shrink-0" />
						</div>
						<span>No environments available</span>
					</DropdownMenu.Item>
				{:else}
					{#each availableEnvironments as env (env.id)}
						<DropdownMenu.Item onSelect={() => handleSelect(env)} class="gap-2 p-2">
							<div class="flex size-6 items-center justify-center rounded-md border">
								{#if env.isLocal}
									<ServerIcon class="size-3.5 shrink-0" />
								{:else}
									<GalleryVerticalEndIcon class="size-3.5 shrink-0" />
								{/if}
							</div>
							<div class="flex flex-col">
								<span>{env.hostname}</span>
								{#if env.isLocal}
									<span class="text-muted-foreground text-xs">Local Docker</span>
								{:else}
									<span class="text-muted-foreground text-xs truncate max-w-32">{env.apiUrl}</span>
								{/if}
							</div>
						</DropdownMenu.Item>
					{/each}
				{/if}
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2 p-2" onSelect={() => goto('/environments')}>
					<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
						<PlusIcon class="size-4" />
					</div>
					<div class="text-muted-foreground font-medium">Manage Environments</div>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
