<script lang="ts">
	import type { PageData } from './$types';
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
	import { environmentManagementAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import Label from '$lib/components/ui/label/label.svelte';

	let { data }: { data: PageData } = $props();
	let { environment } = $derived(data);

	let isRefreshing = $state(false);
	let isTestingConnection = $state(false);
	let isPairing = $state(false);
	let bootstrapToken = $state('');

	let activeSection = $state<string>('overview');

	const sections = [
		{ id: 'overview', Label: 'Overview', icon: MonitorIcon },
		{ id: 'connection', Label: 'Connection', icon: GlobeIcon },
		{ id: 'pairing', Label: 'Pair/Rotate', icon: SettingsIcon }
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
			const result = await environmentManagementAPI.testConnection(environment.id);
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
			await environmentManagementAPI.update(environment.id, { bootstrapToken });
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

	const environmentDisplayName = $derived(environment.name);
</script>

<div class="space-y-6 pb-16">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/environments')}>
				<ArrowLeftIcon class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{environmentDisplayName}</h1>
				<p class="text-muted-foreground mt-1 text-sm">Environment details and management</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={testConnection} disabled={isTestingConnection}>
				{#if isTestingConnection}
					<RefreshCwIcon class="mr-2 size-4 animate-spin" />
				{:else}
					<TerminalIcon class="mr-2 size-4" />
				{/if}
				Test Connection
			</Button>
			<Button onclick={refreshEnvironment} disabled={isRefreshing}>
				{#if isRefreshing}
					<RefreshCwIcon class="mr-2 size-4 animate-spin" />
				{:else}
					<RefreshCwIcon class="mr-2 size-4" />
				{/if}
				Refresh
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
		<div class="lg:col-span-1">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Sections</Card.Title>
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
								{section.Label}
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
								Environment Overview
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-6">
							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div class="space-y-4">
									<div>
										<Label class="text-muted-foreground text-sm font-medium">Name</Label>
										<div class="mt-1 text-lg font-semibold">{environmentDisplayName}</div>
									</div>
									<div>
										<Label class="text-muted-foreground text-sm font-medium">Status</Label>
										<div class="mt-1">
											<StatusBadge
												text={environment.status === 'online' ? 'Online' : 'Offline'}
												variant={environment.status === 'online' ? 'green' : 'red'}
											/>
										</div>
									</div>
									<div>
										<Label class="text-muted-foreground text-sm font-medium">Enabled</Label>
										<div class="mt-1">
											<StatusBadge
												text={environment.enabled ? 'Enabled' : 'Disabled'}
												variant={environment.enabled ? 'green' : 'gray'}
											/>
										</div>
									</div>
								</div>
								<div class="space-y-4">
									<div>
										<Label class="text-muted-foreground text-sm font-medium">Environment ID</Label>
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
								Connection Details
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div>
								<Label class="text-muted-foreground text-sm font-medium">Name</Label>
								<div class="mt-1 text-sm">{environmentDisplayName}</div>
							</div>
							<div>
								<Label class="text-muted-foreground text-sm font-medium">API URL</Label>
								<div class="bg-muted mt-1 break-all rounded-md px-3 py-2 font-mono text-sm">{environment.apiUrl}</div>
							</div>
							<div class="pt-4">
								<Button onclick={testConnection} disabled={isTestingConnection} class="w-full">
									{#if isTestingConnection}
										<RefreshCwIcon class="mr-2 h-4 w-4 animate-spin" />
										Testing Connection...
									{:else}
										<TerminalIcon class="mr-2 h-4 w-4" />
										Test Connection
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
								Pair / Rotate Agent Token
							</Card.Title>
							<Card.Description>
								The token is stored securely on the server and not displayed. Use a Bootstrap Token to pair or rotate.
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div>
								<Label class="text-muted-foreground text-sm font-medium">Bootstrap Token</Label>
								<input
									class="bg-background focus:ring-primary mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
									type="password"
									placeholder="Enter AGENT_BOOTSTRAP_TOKEN"
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
									Pair / Rotate
								</Button>
								<Button variant="outline" onclick={() => (bootstrapToken = '')} disabled={isPairing}>Clear</Button>
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
			<span class="text-sm">Refreshing...</span>
		</div>
	{/if}
</div>
