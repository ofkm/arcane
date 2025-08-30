<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import { goto, invalidateAll } from '$app/navigation';
	import { format } from 'date-fns';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { environmentManagementAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Label from '$lib/components/ui/label/label.svelte';

	let { data }: { data: PageData } = $props();
	let { environment } = $derived(data);

	let isRefreshing = $state(false);
	let isTestingConnection = $state(false);
	let activeSection = $state<string>('overview');

	const sections = [
		{ id: 'overview', Label: 'Overview', icon: MonitorIcon },
		{ id: 'connection', Label: 'Connection', icon: GlobeIcon },
		{ id: 'activity', Label: 'Activity', icon: ActivityIcon }
	];

	onMount(() => {
		const interval = setInterval(refreshEnvironment, 30000);
		return () => clearInterval(interval);
	});

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

	const environmentDisplayName = $derived(environment?.hostname || 'Environment Details');
</script>

<div class="space-y-6 pb-16">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/environments')}>
				<ArrowLeftIcon class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{environmentDisplayName}</h1>
				<p class="text-muted-foreground mt-1 text-sm">Environment details and management</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={testConnection} disabled={isTestingConnection}>
				{#if isTestingConnection}
					<RefreshCwIcon class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<TerminalIcon class="mr-2 h-4 w-4" />
				{/if}
				Test Connection
			</Button>
			<Button onclick={refreshEnvironment} disabled={isRefreshing}>
				{#if isRefreshing}
					<RefreshCwIcon class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<RefreshCwIcon class="mr-2 h-4 w-4" />
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
										<Label class="text-muted-foreground text-sm font-medium">Hostname</Label>
										<div class="mt-1 text-lg font-semibold">{environment.hostname}</div>
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
									<div>
										<Label class="text-muted-foreground text-sm font-medium">Created</Label>
										<div class="mt-1 text-sm">{format(new Date(environment.createdAt), 'PP p')}</div>
									</div>
									{#if environment.updatedAt}
										<div>
											<Label class="text-muted-foreground text-sm font-medium">Last Updated</Label>
											<div class="mt-1 text-sm">{format(new Date(environment.updatedAt), 'PP p')}</div>
										</div>
									{/if}
								</div>
							</div>
							{#if environment.description}
								<div>
									<Label class="text-muted-foreground text-sm font-medium">Description</Label>
									<div class="mt-1 text-sm">{environment.description}</div>
								</div>
							{/if}
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
								<Label class="text-muted-foreground text-sm font-medium">API URL</Label>
								<div class="bg-muted mt-1 break-all rounded-md px-3 py-2 font-mono text-sm">{environment.apiUrl}</div>
							</div>
							{#if environment.lastSeen}
								<div>
									<Label class="text-muted-foreground text-sm font-medium">Last Seen</Label>
									<div class="mt-1 text-sm">{format(new Date(environment.lastSeen), 'PP p')}</div>
								</div>
							{:else}
								<div>
									<Label class="text-muted-foreground text-sm font-medium">Last Seen</Label>
									<div class="text-muted-foreground mt-1 text-sm">Never</div>
								</div>
							{/if}
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

					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<SettingsIcon class="h-5 w-5" />
								Connection Health
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-sm">Connection Status</span>
									<StatusBadge
										text={environment.status === 'online' ? 'Connected' : 'Disconnected'}
										variant={environment.status === 'online' ? 'green' : 'red'}
									/>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm">Environment Enabled</span>
									<StatusBadge text={environment.enabled ? 'Yes' : 'No'} variant={environment.enabled ? 'green' : 'gray'} />
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{:else if activeSection === 'activity'}
				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<ActivityIcon class="h-5 w-5" />
								Activity Log
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-muted-foreground py-8 text-center">
								<DatabaseIcon class="mx-auto mb-3 h-12 w-12 opacity-50" />
								<p>Activity logging coming soon</p>
								<p class="text-sm">Environment activity and logs will be displayed here</p>
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
