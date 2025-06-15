<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { Agent } from '$lib/types/agent.type';
	import type { ColumnDef } from '@tanstack/table-core';
	import { formatDistanceToNow } from 'date-fns';
	import { RefreshCw, AlertCircle, Loader2, Monitor, Eye, Trash2, Terminal, Key, Server, Ellipsis } from '@lucide/svelte';
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
	import { agentAPI } from '$lib/services/api';

	let { data } = $props();

	let agents: Agent[] = $state(data.agents || []);
	let loading = $state(false);
	let error = $state('');
	let selectedAgentIds = $state<string[]>([]);

	const columns: ColumnDef<Agent>[] = [
		{ accessorKey: 'hostname', header: 'Agent' },
		{ accessorKey: 'status', header: 'Status' },
		{ accessorKey: 'platform', header: 'Platform' },
		{ accessorKey: 'version', header: 'Version' },
		{ accessorKey: 'lastSeen', header: 'Last Seen' },
		{ accessorKey: 'actions', header: ' ' }
	];

	onMount(() => {
		const interval = setInterval(refreshAgents, 30000);
		return () => clearInterval(interval);
	});

	async function refreshAgents() {
		if (loading) return;

		try {
			loading = true;
			agents = await agentAPI.list();
			error = '';
		} catch (err) {
			console.error('Failed to refresh agents:', err);
		} finally {
			loading = false;
		}
	}

	async function loadAgents() {
		try {
			loading = true;
			error = '';
			agents = await agentAPI.list();
		} catch (err) {
			console.error('Failed to load agents:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function deleteAgent(agentId: string, hostname: string) {
		openConfirmDialog({
			title: `Confirm Removal`,
			message: `Are you sure you want to remove agent "${hostname}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(agentAPI.delete(agentId)),
						message: 'Failed to Remove Agent',
						onSuccess: async () => {
							toast.success('Agent Removed Successfully');
							await invalidateAll();
						}
					});
				}
			}
		});
	}

	async function handleBulkDelete() {
		if (selectedAgentIds.length === 0) return;

		openConfirmDialog({
			title: 'Confirm Bulk Removal',
			message: `Are you sure you want to remove ${selectedAgentIds.length} agent(s)? This action cannot be undone.`,
			confirm: {
				label: 'Remove All',
				destructive: true,
				action: async () => {
					try {
						await Promise.all(selectedAgentIds.map((id) => agentAPI.delete(id)));
						toast.success(`${selectedAgentIds.length} agent(s) removed successfully`);
						selectedAgentIds = [];
						await invalidateAll();
					} catch (err) {
						console.error('Failed to remove agents:', err);
						toast.error('Failed to remove some agents');
					}
				}
			}
		});
	}
</script>

<svelte:head>
	<title>Agent Management - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Agent Management</h1>
		<p class="text-muted-foreground mt-1 text-sm">Manage and monitor your remote agents</p>
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
						<Card.Title>Remote Agents</Card.Title>
						<Card.Description>Connected Docker agents</Card.Description>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedAgentIds.length > 0}
						<Button variant="destructive" onclick={handleBulkDelete}>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Selected ({selectedAgentIds.length})
						</Button>
					{/if}
					<Button onclick={loadAgents} disabled={loading}>
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
				{#if agents.length === 0 && !loading}
					<div class="py-16 text-center">
						<Monitor class="mx-auto mb-4 h-16 w-16 text-gray-400" />
						<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No agents registered</h3>
						<p class="mb-4 text-gray-600 dark:text-gray-400">Get started by connecting your first agent</p>
						<div class="mx-auto max-w-md rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
							<p class="text-sm text-gray-600 dark:text-gray-400">Make sure your Go agent is running and connecting to:</p>
							<code class="mt-2 inline-block rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800 dark:bg-gray-700 dark:text-gray-200"> http://localhost:3000/api/agents/register </code>
						</div>
					</div>
				{:else if agents.length > 0}
					<div class="flex h-full flex-1 flex-col">
						<UniversalTable
							data={agents}
							{columns}
							idKey="id"
							bind:selectedIds={selectedAgentIds}
							features={{
								sorting: true,
								filtering: true,
								selection: false
							}}
							display={{
								filterPlaceholder: 'Search agents...',
								noResultsMessage: 'No agents found'
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
									<span class="capitalize font-medium">{item.platform}</span>
								</Table.Cell>
								<Table.Cell>
									<span class="font-mono text-sm">{item.version}</span>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm text-gray-600 dark:text-gray-400">{formatDistanceToNow(new Date(item.lastSeen))} ago</span>
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
												<DropdownMenu.Item onclick={() => goto(`/agents/${item.id}`)}>
													<Eye class="size-4" />
													View Details
												</DropdownMenu.Item>
												{#if item.status === 'online'}
													<DropdownMenu.Item onclick={() => goto(`/agents/${item.id}`)}>
														<Terminal class="size-4" />
														Send Command
													</DropdownMenu.Item>
													<DropdownMenu.Item onclick={() => goto(`/agents/${item.id}`)}>
														<Key class="size-4" />
														Manage Tokens
													</DropdownMenu.Item>
												{/if}
												<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => deleteAgent(item.id, item.hostname)}>
													<Trash2 class="size-4" />
													Delete Agent
												</DropdownMenu.Item>
											</DropdownMenu.Group>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							{/snippet}
						</UniversalTable>
					</div>
				{:else}
					<div class="text-muted-foreground py-8 text-center italic">Loading agents...</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	{#if loading && agents.length > 0}
		<div class="fixed right-4 bottom-4 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white shadow-lg">
			<Loader2 class="h-4 w-4 animate-spin" />
			<span class="text-sm">Refreshing...</span>
		</div>
	{/if}
</div>
