<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import { goto, invalidateAll } from '$app/navigation';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { toast } from 'svelte-sonner';
	import Label from '$lib/components/ui/label/label.svelte';
	import { m } from '$lib/paraglide/messages';
	import { environmentManagementService } from '$lib/services/env-mgmt-service.js';

	let { data } = $props();
	let { environment } = $derived(data);

	let isRefreshing = $state(false);
	let isTestingConnection = $state(false);
	let isPairing = $state(false);
	let bootstrapToken = $state('');

	let activeSection = $state<string>('overview');

	const sections = [
		{ id: 'overview', Label: m.environments_section_overview, icon: MonitorIcon },
		{ id: 'connection', Label: m.environments_section_connection, icon: GlobeIcon },
		{ id: 'pairing', Label: m.environments_section_pairing, icon: SettingsIcon }
	];

	async function refreshEnvironment() {
		if (isRefreshing) return;
		try {
			isRefreshing = true;
			await invalidateAll();
		} catch (err) {
			console.error('Failed to refresh environment:', err);
			toast.error('Failed to refresh environment data');
		} finally {
			isRefreshing = false;
		}
	}

	async function testConnection() {
		if (isTestingConnection) return;
		try {
			isTestingConnection = true;
			const result = await environmentManagementService.testConnection(environment.id);
			if (result.status === 'online') {
				toast.success('Connection successful');
			} else {
				toast.error(`Connection failed: ${result.message || 'Unknown error'}`);
			}
			await refreshEnvironment();
		} catch (error) {
			toast.error('Failed to test connection');
			console.error(error);
		} finally {
			isTestingConnection = false;
		}
	}

	async function pairOrRotate() {
		if (!bootstrapToken) {
			toast.error('Bootstrap token is required');
			return;
		}
		try {
			isPairing = true;
			await environmentManagementService.update(environment.id, { bootstrapToken });
			toast.success('Agent paired successfully');
			bootstrapToken = '';
			await refreshEnvironment();
		} catch (e) {
			console.error(e);
			toast.error('Failed to pair/rotate agent token');
		} finally {
			isPairing = false;
		}
	}

	const environmentDisplayName = $derived(() => environment?.name ?? m.common_unknown());
</script>

<div class="space-y-6 pb-16">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/environments')}>
				<ArrowLeftIcon class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{environmentDisplayName()}</h1>
				<p class="text-muted-foreground mt-1 text-sm">{m.environments_page_subtitle()}</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={testConnection} disabled={isTestingConnection}>
				{#if isTestingConnection}
					<RefreshCwIcon class="mr-2 size-4 animate-spin" />
					{m.environments_testing_connection()}
				{:else}
					<TerminalIcon class="mr-2 size-4" />
					{m.environments_test_connection()}
				{/if}
			</Button>
			<Button onclick={refreshEnvironment} disabled={isRefreshing}>
				{#if isRefreshing}
					<RefreshCwIcon class="mr-2 size-4 animate-spin" />
				{:else}
					<RefreshCwIcon class="mr-2 size-4" />
				{/if}
				{m.common_refresh()}
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
		<div class="lg:col-span-1">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">{m.environments_sections_title()}</Card.Title>
				</Card.Header>
				<Card.Content class="p-0">
					<nav class="space-y-1">
						{#each sections as section}
							{@const Icon = section.icon}
							<button
								onclick={() => (activeSection = section.id)}
								class="hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors {activeSection ===
								section.id
									? 'bg-muted border-primary border-r-2'
									: ''}"
							>
								<Icon class="size-4" />
								{section.Label()}
							</button>
						{/each}
					</nav>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="lg:col-span-3">
			{#if activeSection === 'overview'}
				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<MonitorIcon class="size-5" />
								{m.environments_overview_title()}
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-6">
							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div class="space-y-4">
									<div>
										<Label class="text-muted-foreground text-sm font-medium">{m.common_name()}</Label>
										<div class="mt-1 text-lg font-semibold">{environmentDisplayName()}</div>
									</div>
									<div>
										<Label class="text-muted-foreground text-sm font-medium">{m.common_status()}</Label>
										<div class="mt-1">
											<StatusBadge
												text={environment.status === 'online' ? m.common_online() : m.common_offline()}
												variant={environment.status === 'online' ? 'green' : 'red'}
											/>
										</div>
									</div>
									<div>
										<Label class="text-muted-foreground text-sm font-medium">{m.common_enabled()}</Label>
										<div class="mt-1">
											<StatusBadge
												text={environment.enabled ? m.common_enabled() : m.common_disabled()}
												variant={environment.enabled ? 'green' : 'gray'}
											/>
										</div>
									</div>
								</div>
								<div class="space-y-4">
									<div>
										<Label class="text-muted-foreground text-sm font-medium">{m.environments_environment_id_label()}</Label>
										<div class="bg-muted mt-1 rounded px-2 py-1 font-mono text-sm">{environment.id}</div>
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{:else if activeSection === 'connection'}
				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<GlobeIcon class="h-5 w-5" />
								{m.environments_connection_title()}
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div>
								<Label class="text-muted-foreground text-sm font-medium">{m.common_name()}</Label>
								<div class="mt-1 text-sm">{environmentDisplayName()}</div>
							</div>
							<div>
								<Label class="text-muted-foreground text-sm font-medium">{m.environments_api_url()}</Label>
								<div class="bg-muted mt-1 break-all rounded-md px-3 py-2 font-mono text-sm">{environment.apiUrl}</div>
							</div>
							<div class="pt-4">
								<Button onclick={testConnection} disabled={isTestingConnection} class="w-full">
									{#if isTestingConnection}
										<RefreshCwIcon class="mr-2 h-4 w-4 animate-spin" />
										{m.environments_testing_connection()}
									{:else}
										<TerminalIcon class="mr-2 h-4 w-4" />
										{m.environments_test_connection()}
									{/if}
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{:else if activeSection === 'pairing'}
				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<SettingsIcon class="h-5 w-5" />
								{m.environments_pair_rotate_title()}
							</Card.Title>
							<Card.Description>
								{m.environments_pair_rotate_description()}
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div>
								<Label class="text-muted-foreground text-sm font-medium">{m.environments_bootstrap_label()}</Label>
								<input
									class="bg-background focus:ring-primary mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
									type="password"
									placeholder={m.environments_bootstrap_placeholder()}
									bind:value={bootstrapToken}
								/>
							</div>
							<div class="flex gap-2">
								<Button onclick={pairOrRotate} disabled={isPairing || !bootstrapToken}>
									{#if isPairing}
										<RefreshCwIcon class="mr-2 h-4 w-4 animate-spin" />
									{:else}
										<SettingsIcon class="mr-2 h-4 w-4" />
									{/if}
									{m.environments_pair_rotate_action()}
								</Button>
								<Button variant="outline" onclick={() => (bootstrapToken = '')} disabled={isPairing}>{m.common_clear()}</Button>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
		</div>
	</div>

	{#if isRefreshing}
		<div class="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white shadow-lg">
			<RefreshCwIcon class="h-4 w-4 animate-spin" />
			<span class="text-sm">{m.environments_refreshing()}</span>
		</div>
	{/if}
</div>
