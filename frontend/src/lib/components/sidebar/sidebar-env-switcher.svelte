<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import ServerIcon from '@lucide/svelte/icons/server';
	import { environmentStore } from '$lib/stores/environment.store';
	import type { Environment } from '$lib/types/environment.type';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';

	type Props = {
		isAdmin?: boolean;
	};

	let { isAdmin = false }: Props = $props();

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
</script>

<Sidebar.Menu>
	{#if sidebar.open}
		<Label class="text-sidebar-foreground/60 mb-2 px-2 text-xs font-medium">{m.sidebar_environment_label()}</Label>
	{/if}
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props: childProps })}
					<Sidebar.MenuButton
						{...childProps}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						{#if currentSelectedEnvironment}
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
							>
								{#if currentSelectedEnvironment.isLocal}
									<ServerIcon class="size-4" />
								{:else}
									<GlobeIcon class="size-4" />
								{/if}
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">
									{getEnvLabel(currentSelectedEnvironment)}
								</span>
								<span class="truncate text-xs">
									{currentSelectedEnvironment.isLocal ? m.sidebar_local_docker_socket() : currentSelectedEnvironment.apiUrl}
								</span>
							</div>
						{:else}
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
							>
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
				class="w-[var(--bits-dropdown-menu-anchor-width)] min-w-56 rounded-lg"
				align="start"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				sideOffset={4}
			>
				<DropdownMenu.Label class="text-muted-foreground text-xs">{m.sidebar_select_environment()}</DropdownMenu.Label>
				{#if availableEnvironments.length === 0}
					<DropdownMenu.Item disabled class="gap-2 p-2">
						<div class="flex size-6 items-center justify-center rounded-md border">
							<ServerIcon class="size-3.5 shrink-0" />
						</div>
						<span>{m.sidebar_no_environments()}</span>
					</DropdownMenu.Item>
				{:else}
					{#each availableEnvironments as env (env.id)}
						<DropdownMenu.Item onSelect={() => handleSelect(env)} class="gap-2 p-2">
							<div class="flex size-6 items-center justify-center rounded-md border">
								{#if env.isLocal}
									<ServerIcon class="size-3.5 shrink-0" />
								{:else}
									<GlobeIcon class="size-3.5 shrink-0" />
								{/if}
							</div>
							<div class="flex flex-col">
								<span>{getEnvLabel(env)}</span>
								{#if env.isLocal}
									<span class="text-muted-foreground text-xs">{m.sidebar_local_docker_socket()}</span>
								{:else}
									<span class="text-muted-foreground max-w-32 truncate text-xs">{env.apiUrl}</span>
								{/if}
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
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
