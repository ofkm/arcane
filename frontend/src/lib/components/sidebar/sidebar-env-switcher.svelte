<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RouterIcon from '@lucide/svelte/icons/router';
	import ServerIcon from '@lucide/svelte/icons/server';
	import { environmentStore } from '$lib/stores/environment.store.svelte';
	import type { Environment } from '$lib/types/environment.type';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import settingsStore from '$lib/stores/config-store';

	type Props = {
		isAdmin?: boolean;
	};

	let { isAdmin = false }: Props = $props();

	const sidebar = useSidebar();

	let dropdownOpen = $state(false);

	$effect(() => {
		if (sidebar.state === 'collapsed' && !sidebar.isHovered && dropdownOpen) {
			dropdownOpen = false;
		}
	});

	async function handleSelect(env: Environment) {
		try {
			await environmentStore.setEnvironment(env);
		} catch (error) {
			console.error('Failed to set environment:', error);
			toast.error('Failed to Connect to Environment');
		}
	}

	function getEnvLabel(env: Environment): string {
		if (env.isLocal) {
			return 'Local Docker';
		} else {
			return env.name;
		}
	}

	function getConnectionString(env: Environment): string {
		if (env.isLocal) {
			return $settingsStore.dockerHost || 'unix:///var/run/docker.sock';
		} else {
			return env.apiUrl;
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root bind:open={dropdownOpen}>
			<DropdownMenu.Trigger>
				{#snippet child({ props: childProps })}
					<Sidebar.MenuButton
						{...childProps}
						size="lg"
						tooltipContent={environmentStore.selected ? getEnvLabel(environmentStore.selected) : m.sidebar_no_environment()}
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						{#if environmentStore.selected}
							<div class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								{#if environmentStore.selected.isLocal}
									<ServerIcon class="size-4" />
								{:else}
									<RouterIcon class="size-4" />
								{/if}
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">
									{getEnvLabel(environmentStore.selected)}
								</span>
								<span class="truncate text-xs">
									{getConnectionString(environmentStore.selected)}
								</span>
							</div>
						{:else}
							<div class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								<ServerIcon class="size-4" />
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">{m.sidebar_no_environment()}</span>
								<span class="truncate text-xs">{m.sidebar_select_one()}</span>
							</div>
						{/if}
						<ChevronsUpDownIcon class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[var(--bits-dropdown-menu-anchor-width)] min-w-56 rounded-2xl border shadow-lg backdrop-blur-[var(--glass-blur-popup)] backdrop-saturate-150"
				align="start"
				side="right"
				sideOffset={4}
			>
				<div
					role="group"
					onmouseenter={() => {
						// Keep sidebar hovered when mouse is over dropdown
						if (sidebar.state === 'collapsed') {
							sidebar.setHovered(true);
						}
					}}
					onmouseleave={() => {
						// Clear hover when leaving dropdown
						sidebar.setHovered(false, 200);
					}}
				>
					<DropdownMenu.Label class="text-muted-foreground text-xs">{m.sidebar_select_environment()}</DropdownMenu.Label>
					{#if environmentStore.available.length === 0}
						<DropdownMenu.Item disabled class="gap-2 p-2">
							<div class="flex size-6 items-center justify-center rounded-md border">
								<ServerIcon class="size-3.5 shrink-0" />
							</div>
							<span>{m.sidebar_no_environments()}</span>
						</DropdownMenu.Item>
					{:else}
						{#each environmentStore.available as env (env.id)}
							{@const isActive = environmentStore.selected?.id === env.id}
							<DropdownMenu.Item
								onSelect={() => !isActive && handleSelect(env)}
								class={cn(
									'gap-2 p-2',
									isActive && 'bg-sidebar-accent text-sidebar-accent-foreground pointer-events-none font-medium'
								)}
							>
								<div
									class={cn(
										'flex size-6 items-center justify-center rounded-md border',
										isActive ? 'bg-primary border-primary' : 'border-border'
									)}
								>
									{#if env.isLocal}
										<ServerIcon class={cn('size-3.5 shrink-0', isActive && 'text-primary-foreground')} />
									{:else}
										<RouterIcon class={cn('size-3.5 shrink-0', isActive && 'text-primary-foreground')} />
									{/if}
								</div>
								<div class="flex flex-col">
									<span>{getEnvLabel(env)}</span>
									<span class={cn('text-xs', isActive ? 'text-sidebar-accent-foreground/70' : 'text-muted-foreground')}>
										{getConnectionString(env)}
									</span>
								</div>
							</DropdownMenu.Item>
						{/each}
					{/if}
					{#if isAdmin}
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="gap-2 p-2" onSelect={() => goto('/environments')}>
							<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
								<PlusIcon class="size-4" />
							</div>
							<div class="text-muted-foreground font-medium">{m.sidebar_manage_environments()}</div>
						</DropdownMenu.Item>
					{/if}
				</div>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
