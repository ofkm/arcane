<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Agent } from '$lib/types/agent.type';
	import { formatDistanceToNow } from 'date-fns';
	import { RefreshCw, AlertCircle, Loader2, Monitor, CheckCircle, Eye, Send } from '@lucide/svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let agents: Agent[] = $state(data.agents || []);
	let loading = $state(false);
	let error = $state(data.error || '');

	onMount(() => {
		// Refresh every 10 seconds for real-time updates
		const interval = setInterval(loadAgents, 10000);
		return () => clearInterval(interval);
	});

	async function loadAgents() {
		try {
			loading = true;
			console.log('Client: Loading agents...');
			const response = await fetch('/api/agents');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const responseData = await response.json();
			console.log('Client: Agents loaded:', responseData);

			agents = responseData.agents || [];
			error = '';
		} catch (err) {
			console.error('Client: Failed to load agents:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function getStatusColor(agent: Agent) {
		if (agent.status === 'online') return 'bg-green-500';
		return 'bg-red-500';
	}

	function getStatusText(agent: Agent) {
		if (agent.status === 'online') return 'Online';
		return 'Offline';
	}

	function viewAgentDetails(agentId: string) {
		goto(`/agents/${agentId}`);
	}
</script>

<div class="container mx-auto px-6 py-8">
	<!-- Header -->
	<div class="flex justify-between items-center mb-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Agent Management</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">Manage and monitor your remote agents</p>
		</div>
		<button onclick={loadAgents} class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
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
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
			<div class="flex items-center gap-2">
				<AlertCircle class="h-5 w-5" />
				<strong>Error:</strong>
				{error}
			</div>
		</div>
	{/if}

	<!-- Loading State (only show during client-side refreshes) -->
	{#if loading && agents.length === 0}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="h-8 w-8 text-blue-600 mb-4 animate-spin" />
			<p class="text-gray-600 dark:text-gray-400">Loading agents...</p>
		</div>
	{:else if agents.length === 0}
		<!-- Empty State -->
		<div class="text-center py-16">
			<Monitor class="h-16 w-16 text-gray-400 mx-auto mb-4" />
			<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No agents registered</h3>
			<p class="text-gray-600 dark:text-gray-400 mb-4">Get started by connecting your first agent</p>
			<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
				<p class="text-sm text-gray-600 dark:text-gray-400">Make sure your Go agent is running and connecting to:</p>
				<code class="text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded mt-2 inline-block"> ws://localhost:3001/agent/connect </code>
			</div>
		</div>
	{:else}
		<!-- Agents Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each agents as agent}
				<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
					<!-- Agent Header -->
					<div class="flex items-start justify-between mb-4">
						<div class="flex items-center gap-3">
							<div class="relative">
								<div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
									<Monitor class="h-6 w-6 text-gray-600 dark:text-gray-400" />
								</div>
								<div class="absolute -top-1 -right-1 w-4 h-4 {getStatusColor(agent)} rounded-full border-2 border-white dark:border-gray-800"></div>
							</div>
							<div>
								<h3 class="font-semibold text-gray-900 dark:text-white">{agent.hostname}</h3>
								<p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{agent.id}</p>
							</div>
						</div>
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {agent.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}">
							{getStatusText(agent)}
						</span>
					</div>

					<!-- Agent Details -->
					<div class="space-y-3">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-500 dark:text-gray-400">Platform</span>
								<p class="font-medium text-gray-900 dark:text-white capitalize">{agent.platform}</p>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Version</span>
								<p class="font-medium text-gray-900 dark:text-white">{agent.version}</p>
							</div>
						</div>

						<div>
							<span class="text-gray-500 dark:text-gray-400 text-sm">Capabilities</span>
							<div class="flex flex-wrap gap-1 mt-1">
								{#each agent.capabilities as capability}
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
										{capability}
									</span>
								{:else}
									<span class="text-gray-400 dark:text-gray-500 text-sm">None</span>
								{/each}
							</div>
						</div>

						<div class="pt-3 border-t border-gray-100 dark:border-gray-700">
							<p class="text-xs text-gray-500 dark:text-gray-400">
								Last seen: {formatDistanceToNow(new Date(agent.lastSeen))} ago
							</p>
						</div>
					</div>

					<!-- Connected Status -->
					{#if agent.status === 'online'}
						<div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
							<div class="flex items-center gap-2">
								<CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
								<p class="text-sm font-medium text-green-700 dark:text-green-400">Ready to receive commands</p>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="mt-4 flex gap-2">
						<button onclick={() => viewAgentDetails(agent.id)} class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2">
							<Eye class="h-4 w-4" />
							View Details
						</button>
						{#if agent.status === 'online'}
							<button onclick={() => viewAgentDetails(agent.id)} class="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2">
								<Send class="h-4 w-4" />
								Send Command
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
