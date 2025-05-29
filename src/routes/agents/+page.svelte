<script lang="ts">
	import { onMount } from 'svelte';
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
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">Agent Management</h1>
		<button onclick={loadAgents} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" disabled={loading}>
			{loading ? 'Loading...' : 'Refresh'}
		</button>
	</div>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			<strong>Error:</strong>
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-8">Loading agents...</div>
	{:else if agents.length === 0}
		<div class="text-center py-8 text-gray-500">
			<p>No agents registered yet.</p>
			<p class="text-sm mt-2">Make sure your Go agent is running and connecting to ws://localhost:3001/agent/connect</p>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each agents as agent}
				<div class="bg-white rounded-lg border p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<div class="w-3 h-3 rounded-full {getStatusColor(agent)}"></div>
							<div>
								<h3 class="font-medium">{agent.hostname}</h3>
								<p class="text-sm text-gray-500">{agent.id}</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-sm font-medium">
								{agent.connected ? 'Connected' : 'Disconnected'}
							</p>
							<p class="text-xs text-gray-500">
								Last seen: {formatDistanceToNow(new Date(agent.lastSeen))} ago
							</p>
						</div>
					</div>

					<div class="mt-3 grid grid-cols-3 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Platform:</span>
							{agent.platform}
						</div>
						<div>
							<span class="text-gray-500">Version:</span>
							{agent.version}
						</div>
						<div>
							<span class="text-gray-500">Capabilities:</span>
							{agent.capabilities.join(', ') || 'None'}
						</div>
					</div>

					{#if agent.connected}
						<div class="mt-4 p-3 bg-green-50 rounded border border-green-200">
							<p class="text-sm text-green-700">✓ Agent is connected and ready to receive commands</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Debug Section -->
	<div class="mt-8 p-4 bg-gray-100 rounded">
		<h3 class="font-medium mb-2">Debug Information</h3>
		<p class="text-sm text-gray-600">
			• Total agents: {agents.length}<br />
			• Connected agents: {agents.filter((a) => a.connected).length}<br />
			• WebSocket endpoint: ws://localhost:3001/agent/connect<br />
			• Last refresh: {new Date().toLocaleTimeString()}
		</p>
	</div>
</div>
