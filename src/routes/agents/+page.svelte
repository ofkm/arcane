<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Agent } from '$lib/types/agent.type';
	import { formatDistanceToNow } from 'date-fns';

	let agents: (Agent & { connected: boolean })[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(() => {
		loadAgents();
		// Refresh every 10 seconds for debugging
		const interval = setInterval(loadAgents, 10000);
		return () => clearInterval(interval);
	});

	async function loadAgents() {
		try {
			console.log('Loading agents...');
			const response = await fetch('/api/agents');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			console.log('Agents loaded:', data);

			agents = data.agents || [];
			error = '';
		} catch (err) {
			console.error('Failed to load agents:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function getStatusColor(agent: Agent & { connected: boolean }) {
		if (agent.connected) return 'bg-green-500';
		if (agent.status === 'online') return 'bg-yellow-500';
		return 'bg-red-500';
	}

	function getStatusText(agent: Agent & { connected: boolean }) {
		if (agent.connected) return 'Connected';
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
				<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			{:else}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
				</svg>
			{/if}
			{loading ? 'Loading...' : 'Refresh'}
		</button>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
				</svg>
				<strong>Error:</strong>
				{error}
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<svg class="animate-spin h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<p class="text-gray-600 dark:text-gray-400">Loading agents...</p>
		</div>
	{:else if agents.length === 0}
		<!-- Empty State -->
		<div class="text-center py-16">
			<svg class="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
			</svg>
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
									<svg class="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
									</svg>
								</div>
								<div class="absolute -top-1 -right-1 w-4 h-4 {getStatusColor(agent)} rounded-full border-2 border-white dark:border-gray-800"></div>
							</div>
							<div>
								<h3 class="font-semibold text-gray-900 dark:text-white">{agent.hostname}</h3>
								<p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{agent.id}</p>
							</div>
						</div>
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {agent.connected ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : agent.status === 'online' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}">
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
					{#if agent.connected}
						<div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
							<div class="flex items-center gap-2">
								<svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
								</svg>
								<p class="text-sm font-medium text-green-700 dark:text-green-400">Ready to receive commands</p>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="mt-4 flex gap-2">
						<button onclick={() => viewAgentDetails(agent.id)} class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"> View Details </button>
						{#if agent.connected}
							<button onclick={() => viewAgentDetails(agent.id)} class="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"> Send Command </button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
