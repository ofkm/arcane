<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { Agent } from '$lib/types/agent.type';
	import { formatDistanceToNow } from 'date-fns';
	import {
		RefreshCw,
		AlertCircle,
		Loader2,
		Monitor,
		CheckCircle,
		Eye,
		Send,
		Container,
		HardDrive,
		Trash2
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { getActualAgentStatus } from '$lib/utils/agent-status.utils';
	import { openConfirmDialog } from '$lib/components/confirm-dialog/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util.js';
	import { tryCatch } from '$lib/utils/try-catch.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	let { data } = $props();

	// Initialize from SSR data
	let agents: Agent[] = $state(data.agents || []);
	let loading = $state(false);
	let error = $state('');

	onMount(() => {
		// Refresh every 30 seconds for real-time updates (less frequent since we have SSR)
		const interval = setInterval(refreshAgents, 30000);
		return () => clearInterval(interval);
	});

	// Simplified refresh function - only for periodic updates
	async function refreshAgents() {
		if (loading) return;

		try {
			loading = true;
			const response = await fetch('/api/agents');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const responseData = await response.json();
			agents = responseData.agents || [];
			error = '';
		} catch (err) {
			console.error('Failed to refresh agents:', err);
			// Don't show error for background refresh failures
		} finally {
			loading = false;
		}
	}

	// Manual refresh triggered by user
	async function loadAgents() {
		try {
			loading = true;
			error = '';

			const response = await fetch('/api/agents');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const responseData = await response.json();
			agents = responseData.agents || [];
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
			message: `Are you sure you want to remove this Agent? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(
							fetch(`/api/agents/${agentId}`, {
								method: 'DELETE',
								credentials: 'include'
							})
						),
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

	function getStatusColor(agent: Agent) {
		const actualStatus = getActualAgentStatus(agent);
		if (actualStatus === 'online') return 'bg-green-500';
		return 'bg-red-500';
	}

	function getStatusText(agent: Agent) {
		const actualStatus = getActualAgentStatus(agent);
		if (actualStatus === 'online') return 'Online';
		return 'Offline';
	}

	function viewAgentDetails(agentId: string) {
		goto(`/agents/${agentId}`);
	}
</script>

<div class="container mx-auto px-6 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Agent Management</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">Manage and monitor your remote agents</p>
		</div>
		<button
			onclick={loadAgents}
			class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={loading}
		>
			{#if loading}
				<Loader2 class="h-4 w-4 animate-spin" />
			{:else}
				<RefreshCw class="h-4 w-4" />
			{/if}
			{loading ? 'Loading...' : 'Refresh'}
		</button>
	</div>

	<!-- Error Message -->
	{#if error}
		<div
			class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
		>
			<div class="flex items-center gap-2">
				<AlertCircle class="h-5 w-5" />
				<strong>Error:</strong>
				{error}
			</div>
		</div>
	{/if}

	<!-- Agents content - data is immediately available from SSR -->
	{#if agents.length === 0}
		<!-- Empty State -->
		<div class="py-16 text-center">
			<Monitor class="mx-auto mb-4 h-16 w-16 text-gray-400" />
			<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No agents registered</h3>
			<p class="mb-4 text-gray-600 dark:text-gray-400">
				Get started by connecting your first agent
			</p>
			<div class="mx-auto max-w-md rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Make sure your Go agent is running and connecting to:
				</p>
				<code
					class="mt-2 inline-block rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800 dark:bg-gray-700 dark:text-gray-200"
				>
					http://localhost:3000/agent/register
				</code>
			</div>
		</div>
	{:else}
		<!-- Agents Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each agents as agent}
				<div
					class="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
				>
					<!-- Agent Header -->
					<div class="mb-4 flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div class="relative">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"
								>
									<Monitor class="h-6 w-6 text-gray-600 dark:text-gray-400" />
								</div>
								<div
									class="absolute -top-1 -right-1 h-4 w-4 {getStatusColor(
										agent
									)} rounded-full border-2 border-white dark:border-gray-800"
								></div>
							</div>
							<div>
								<h3 class="font-semibold text-gray-900 dark:text-white">{agent.hostname}</h3>
								<p class="font-mono text-xs text-gray-500 dark:text-gray-400">{agent.id}</p>
							</div>
						</div>
						<span
							class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getActualAgentStatus(
								agent
							) === 'online'
								? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
								: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}"
						>
							{getStatusText(agent)}
						</span>
					</div>

					<!-- Agent Details -->
					<div class="space-y-3">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-500 dark:text-gray-400">Platform</span>
								<p class="font-medium text-gray-900 capitalize dark:text-white">{agent.platform}</p>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Version</span>
								<p class="font-medium text-gray-900 dark:text-white">{agent.version}</p>
							</div>
						</div>

						<!-- Resource Metrics -->
						{#if agent.metrics}
							<div
								class="grid grid-cols-2 gap-2 border-t border-gray-100 py-3 dark:border-gray-700"
							>
								<div class="text-center">
									<div class="mb-1 flex items-center justify-center gap-1">
										<Container class="h-3 w-3 text-blue-600 dark:text-blue-400" />
										<span class="text-xs text-gray-500 dark:text-gray-400">Containers</span>
									</div>
									<p class="text-sm font-semibold text-gray-900 dark:text-white">
										{agent.metrics.containerCount ?? 0}
									</p>
								</div>
								<div class="text-center">
									<div class="mb-1 flex items-center justify-center gap-1">
										<HardDrive class="h-3 w-3 text-green-600 dark:text-green-400" />
										<span class="text-xs text-gray-500 dark:text-gray-400">Images</span>
									</div>
									<p class="text-sm font-semibold text-gray-900 dark:text-white">
										{agent.metrics.imageCount ?? 0}
									</p>
								</div>
							</div>
						{:else}
							<div class="border-t border-gray-100 py-3 dark:border-gray-700">
								<p class="text-center text-xs text-gray-400">No metrics data available</p>
							</div>
						{/if}

						<div>
							<span class="text-sm text-gray-500 dark:text-gray-400">Capabilities</span>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each agent.capabilities as capability}
									<span
										class="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
									>
										{capability}
									</span>
								{:else}
									<span class="text-gray-400 dark:text-gray-500 text-sm">None</span>
								{/each}
							</div>
						</div>

						<div class="border-t border-gray-100 pt-3 dark:border-gray-700">
							<p class="text-xs text-gray-500 dark:text-gray-400">
								Last seen: {formatDistanceToNow(new Date(agent.lastSeen))} ago
							</p>
						</div>
					</div>

					<!-- Connected Status -->
					{#if getActualAgentStatus(agent) === 'online'}
						<div
							class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
						>
							<div class="flex items-center gap-2">
								<CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
								<p class="text-sm font-medium text-green-700 dark:text-green-400">
									Ready to receive commands
								</p>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="mt-4 flex gap-2">
						<ArcaneButton
							action="inspect"
							onClick={() => viewAgentDetails(agent.id)}
							label="View Details"
							class="flex-1"
						/>
						{#if getActualAgentStatus(agent) === 'online'}
							<ArcaneButton
								action="edit"
								onClick={() => viewAgentDetails(agent.id)}
								label="Manage"
								class="flex-1"
							/>
						{/if}
						<ArcaneButton
							action="remove"
							onClick={() => deleteAgent(agent.id, agent.hostname)}
							label="Delete"
							loadingLabel="Deleting..."
							class="flex-1"
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Show subtle loading indicator during background refresh -->
	{#if loading && agents.length > 0}
		<div
			class="fixed right-4 bottom-4 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white shadow-lg"
		>
			<Loader2 class="h-4 w-4 animate-spin" />
			<span class="text-sm">Refreshing...</span>
		</div>
	{/if}
</div>
