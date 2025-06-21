<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { Environment } from '$lib/stores/environment.store';
	import type { ColumnDef } from '@tanstack/table-core';
	import { formatDistanceToNow } from 'date-fns';
	import { RefreshCw, AlertCircle, Loader2, Monitor, Eye, Trash2, Terminal, Key, Server, Ellipsis, Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { openConfirmDialog } from '$lib/components/confirm-dialog/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util.js';
	import { tryCatch } from '$lib/utils/try-catch.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import NewEnvironmentSheet from '$lib/components/sheets/new-environment-sheet.svelte';
	import { environmentManagementAPI } from '$lib/services/api';

	let { data } = $props();

	let environments: Environment[] = $state(data.environments || []);
	let loading = $state(false);
	let error = $state('');
	let selectedEnvironmentIds = $state<string[]>([]);
	let showEnvironmentSheet = $state(false);
	let refreshInProgress = false;

	const columns: ColumnDef<Environment>[] = [
		{ accessorKey: 'hostname', header: 'Environment' },
		{ accessorKey: 'status', header: 'Status' },
		{ accessorKey: 'apiUrl', header: 'API URL' },
		{ accessorKey: 'enabled', header: 'Enabled' },
		{ accessorKey: 'lastSeen', header: 'Last Seen' },
		{ accessorKey: 'actions', header: ' ' }
	];

	onMount(() => {
		const interval = setInterval(refreshEnvironments, 30000);
		return () => clearInterval(interval);
	});

	async function refreshEnvironments() {
		if (refreshInProgress) return;
		refreshInProgress = true;

		try {
			loading = true;
			environments = await environmentManagementAPI.list();
			error = '';
		} catch (err) {
			console.error('Failed to refresh environments:', err);
		} finally {
			loading = false;
			refreshInProgress = false;
		}
	}

	async function loadEnvironments() {
		try {
			loading = true;
			error = '';
			environments = await environmentManagementAPI.list();
		} catch (err) {
			console.error('Failed to load environments:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function deleteEnvironment(environmentId: string, hostname: string) {
		openConfirmDialog({
			title: `Confirm Removal`,
			message: `Are you sure you want to remove environment "${hostname}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentManagementAPI.delete(environmentId)),
						message: 'Failed to Remove Environment',
						onSuccess: async () => {
							toast.success('Environment Removed Successfully');
							await loadEnvironments();
						}
					});
				}
			}
		});
	}

	async function testConnection(environmentId: string) {
		try {
			const result = await environmentManagementAPI.testConnection(environmentId);
			if (result.status === 'online') {
				toast.success('Connection successful');
			} else {
				toast.error(`Connection failed: ${result.message || 'Unknown error'}`);
			}
			await loadEnvironments();
		} catch (error) {
			toast.error('Failed to test connection');
			console.error(error);
		}
	}

	async function handleBulkDelete() {
		if (selectedEnvironmentIds.length === 0) return;

		openConfirmDialog({
			title: 'Confirm Bulk Removal',
			message: `Are you sure you want to remove ${selectedEnvironmentIds.length} environment(s)? This action cannot be undone.`,
			confirm: {
				label: 'Remove All',
				destructive: true,
				action: async () => {
					try {
						await Promise.all(selectedEnvironmentIds.map((id) => environmentManagementAPI.delete(id)));
						toast.success(`${selectedEnvironmentIds.length} environment(s) removed successfully`);
						selectedEnvironmentIds = [];
						await loadEnvironments();
					} catch (err) {
						console.error('Failed to remove environments:', err);
						toast.error('Failed to remove some environments');
					}
				}
			}
		});
	}

	function handleEnvironmentCreated() {
		showEnvironmentSheet = false;
		toast.success('Environment added successfully! You can now select it from the environment switcher.');
		loadEnvironments();
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Environment Management</h1>
		<p class="text-muted-foreground mt-1 text-sm">Manage and monitor your arcane environments</p>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
			<div class="flex items-center gap-2">
				<AlertCircle class="h-5 w-5" />
				<strong>Error:</strong>
				{error}
			</div>
		</div>
	{/if}

	<div class="grid h-full grid-cols-1 gap-6">
		<Card.Root class="flex flex-col border shadow-sm">
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-3">
				<div class="flex items-center gap-2">
					<div class="rounded-full bg-blue-500/10 p-2">
						<Server class="size-5 text-blue-500" />
					</div>
					<div>
						<Card.Title>Environments</Card.Title>
						<Card.Description>Created Environments</Card.Description>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedEnvironmentIds.length > 0}
						<Button variant="destructive" onclick={handleBulkDelete}>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Selected ({selectedEnvironmentIds.length})
						</Button>
					{/if}
					<Button onclick={() => (showEnvironmentSheet = true)}>
						<Plus class="mr-2 h-4 w-4" />
						Add Environment
					</Button>
					<Button onclick={loadEnvironments} disabled={loading}>
						{#if loading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<RefreshCw class="mr-2 h-4 w-4" />
						{/if}
						{loading ? 'Loading...' : 'Refresh'}
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-1 flex-col">
				{#if environments.length === 0 && !loading}
					<div class="py-16 text-center">
						<Monitor class="mx-auto mb-4 h-16 w-16 text-gray-400" />
						<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No environments registered</h3>
						<p class="mb-4 text-gray-600 dark:text-gray-400">Get started by adding your first environment</p>
						<div class="mx-auto max-w-md rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
							<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Add a new environment to connect to an Arcane agent running as an API server.</p>
							<Button onclick={() => (showEnvironmentSheet = true)} class="w-full">
								<Plus class="mr-2 h-4 w-4" />
								Add Environment
							</Button>
						</div>
					</div>
				{:else if environments.length > 0}
					<div class="flex h-full flex-1 flex-col">
						<UniversalTable
							data={environments}
							{columns}
							idKey="id"
							bind:selectedIds={selectedEnvironmentIds}
							features={{
								sorting: true,
								filtering: true,
								selection: true
							}}
							display={{
								filterPlaceholder: 'Search environments...',
								noResultsMessage: 'No environments found'
							}}
							pagination={{
								pageSize: 10,
								pageSizeOptions: [10, 20, 50]
							}}
							sort={{
								defaultSort: { id: 'lastSeen', desc: true }
							}}
						>
							{#snippet rows({ item })}
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div class="relative">
											<div class="flex size-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
												<Monitor class="size-4 text-gray-600 dark:text-gray-400" />
											</div>
											<div class="absolute -top-1 -right-1 size-3 {item.status === 'online' ? 'bg-green-500' : 'bg-red-500'} rounded-full border-2 border-white dark:border-gray-800"></div>
										</div>
										<div>
											<div class="font-medium text-gray-900 dark:text-white">{item.hostname}</div>
											<div class="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.id}</div>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<StatusBadge text={item.status === 'online' ? 'Online' : 'Offline'} variant={item.status === 'online' ? 'green' : 'red'} />
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm font-mono text-muted-foreground">{item.apiUrl}</span>
								</Table.Cell>
								<Table.Cell>
									<StatusBadge text={item.enabled ? 'Enabled' : 'Disabled'} variant={item.enabled ? 'green' : 'gray'} />
								</Table.Cell>
								<Table.Cell>
									{#if item.lastSeen}
										<span class="text-sm text-gray-600 dark:text-gray-400">{formatDistanceToNow(new Date(item.lastSeen))} ago</span>
									{:else}
										<span class="text-sm text-gray-400">Never</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											<Button variant="ghost" size="icon" class="size-8">
												<Ellipsis class="size-4" />
												<span class="sr-only">Open menu</span>
											</Button>
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => testConnection(item.id)}>
													<Terminal class="size-4" />
													Test Connection
												</DropdownMenu.Item>
												<DropdownMenu.Item onclick={() => goto(`/environments/${item.id}`)}>
													<Eye class="size-4" />
													View Details
												</DropdownMenu.Item>
												<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => deleteEnvironment(item.id, item.hostname)}>
													<Trash2 class="size-4" />
													Delete Environment
												</DropdownMenu.Item>
											</DropdownMenu.Group>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							{/snippet}
						</UniversalTable>
					</div>
				{:else}
					<div class="text-muted-foreground py-8 text-center italic">Loading environments...</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	{#if loading && environments.length > 0}
		<div class="fixed right-4 bottom-4 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white shadow-lg">
			<Loader2 class="h-4 w-4 animate-spin" />
			<span class="text-sm">Refreshing...</span>
		</div>
	{/if}
</div>

<NewEnvironmentSheet bind:open={showEnvironmentSheet} onEnvironmentCreated={handleEnvironmentCreated} />
