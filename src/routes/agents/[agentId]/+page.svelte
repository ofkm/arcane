<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import type { Agent, AgentTask } from '$lib/types/agent.type';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Monitor, Terminal, Clock, Settings, Activity, AlertCircle, Server, RefreshCw, Play, ArrowLeft } from '@lucide/svelte';

	// Get data from SSR
	let { data } = $props();

	let agent: Agent | null = $state(data.agent);
	let tasks: AgentTask[] = $state(data.tasks);
	let agentId = data.agentId;
	let loading = $state(false); // Start false since we have SSR data
	let error = $state('');
	let commandDialogOpen = $state(false);
	let taskExecuting = $state(false);

	// Command form state
	let selectedCommand = $state<{ value: string; label: string } | undefined>(undefined);
	let commandArgs = $state('');
	let customCommand = $state('');

	// Predefined commands
	const predefinedCommands = [
		{ value: 'docker_version', label: 'Docker Version' },
		{ value: 'docker_info', label: 'Docker System Info' },
		{ value: 'docker_ps', label: 'List Containers' },
		{ value: 'docker_images', label: 'List Images' },
		{ value: 'system_info', label: 'System Information' },
		{ value: 'agent_upgrade', label: 'Upgrade Agent' },
		{ value: 'docker_prune', label: 'Docker Cleanup' },
		{ value: 'custom', label: 'Custom Command' }
	];

	onMount(() => {
		// Initial load to get connection status
		loadAgentDetails();

		// Refresh every 10 seconds to get real-time connection status
		const interval = setInterval(() => {
			loadAgentDetails();
			loadAgentTasks();
		}, 10000);
		return () => clearInterval(interval);
	});

	async function loadAgentDetails() {
		try {
			const response = await fetch(`/api/agents/${agentId}`);
			if (!response.ok) {
				if (response.status === 404) {
					error = 'Agent not found';
					return;
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const responseData = await response.json();

			// Just update with the agent data
			agent = responseData.agent;
			error = '';
		} catch (err) {
			console.error('Failed to load agent details:', err);
			error = err instanceof Error ? err.message : 'Failed to load agent';
		} finally {
			loading = false;
		}
	}

	async function loadAgentTasks() {
		try {
			// Add admin flag to get full task data including results
			const response = await fetch(`/api/agents/${agentId}/tasks?admin=true`);
			if (response.ok) {
				const responseData = await response.json();
				tasks = responseData.tasks || [];
			}
		} catch (err) {
			console.error('Failed to load agent tasks:', err);
		}
	}

	async function sendCommand() {
		if (!selectedCommand || taskExecuting) return;

		taskExecuting = true;
		try {
			let payload: any = {};

			switch (selectedCommand.value) {
				case 'docker_version':
					payload = { command: 'version' };
					break;
				case 'docker_info':
					payload = { command: 'info' };
					break;
				case 'docker_ps':
					payload = { command: 'ps', args: ['-a'] };
					break;
				case 'docker_images':
					payload = { command: 'images' };
					break;
				case 'system_info':
					payload = { command: 'system', args: ['info'] };
					break;
				case 'agent_upgrade':
					payload = { action: 'upgrade' };
					break;
				case 'docker_prune':
					payload = { command: 'system', args: ['prune', '-f'] };
					break;
				case 'custom':
					if (!customCommand.trim()) {
						toast.error('Please enter a custom command');
						return;
					}
					const parts = customCommand.trim().split(' ');
					payload = {
						command: parts[0],
						args: parts.slice(1).concat(commandArgs ? commandArgs.split(' ') : [])
					};
					break;
			}

			const taskType = selectedCommand.value === 'agent_upgrade' ? 'agent_upgrade' : 'docker_command';

			const response = await fetch(`/api/agents/${agentId}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: taskType,
					payload
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to send command: ${response.statusText}`);
			}

			const result = await response.json();
			toast.success('Command sent successfully');
			commandDialogOpen = false;

			// Reset form
			selectedCommand = undefined;
			commandArgs = '';
			customCommand = '';

			// Refresh tasks
			setTimeout(loadAgentTasks, 1000);
		} catch (err) {
			console.error('Failed to send command:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to send command');
		} finally {
			taskExecuting = false;
		}
	}

	function getStatusClasses(agent: Agent) {
		if (agent.status === 'online') return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
		return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
	}

	function getStatusText(agent: Agent) {
		if (agent.status === 'online') return 'Online';
		return 'Offline';
	}

	// Add this function to check if agent can receive commands
	function canSendCommands(agent: Agent) {
		return agent.status === 'online';
	}

	function getTaskStatusClasses(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
			case 'failed':
				return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
			case 'running':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
		}
	}
</script>

<svelte:head>
	<title>Agent {agent?.hostname || agentId} - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<!-- Breadcrumb -->
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/agents">Agents</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{agent?.hostname || agentId}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				{agent?.hostname || 'Agent Details'}
			</h1>
			<p class="text-sm text-muted-foreground mt-1">
				{agent ? `Agent ID: ${agent.id}` : 'Loading agent information...'}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={() => goto('/agents')}>
				<ArrowLeft class="size-4 mr-2" />
				Back to Agents
			</Button>
			{#if agent && canSendCommands(agent)}
				<Button onclick={() => (commandDialogOpen = true)}>
					<Terminal class="size-4 mr-2" />
					Send Command
				</Button>
			{/if}
		</div>
	</div>

	<!-- Error State -->
	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-16">
			<RefreshCw class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if agent}
		<!-- Agent Overview -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<Card.Root>
				<Card.Content class="p-4 flex items-center space-x-3">
					<div class="bg-blue-500/10 p-2 rounded-full">
						<Server class="size-5 text-blue-500" />
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Status</p>
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusClasses(agent)}">
							{getStatusText(agent)}
						</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4 flex items-center space-x-3">
					<div class="bg-green-500/10 p-2 rounded-full">
						<Monitor class="size-5 text-green-500" />
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Platform</p>
						<p class="font-semibold capitalize">{agent.platform}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4 flex items-center space-x-3">
					<div class="bg-purple-500/10 p-2 rounded-full">
						<Settings class="size-5 text-purple-500" />
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Version</p>
						<p class="font-semibold">{agent.version}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4 flex items-center space-x-3">
					<div class="bg-amber-500/10 p-2 rounded-full">
						<Clock class="size-5 text-amber-500" />
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Last Seen</p>
						<p class="font-semibold text-sm">{formatDistanceToNow(new Date(agent.lastSeen))} ago</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Agent Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Agent Information</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-muted-foreground">Hostname</span>
							<p class="font-medium">{agent.hostname}</p>
						</div>
						<div>
							<span class="text-muted-foreground">Agent ID</span>
							<p class="font-mono text-xs">{agent.id}</p>
						</div>
						<div>
							<span class="text-muted-foreground">Created</span>
							<p class="font-medium">{new Date(agent.createdAt).toLocaleDateString()}</p>
						</div>
						<div>
							<span class="text-muted-foreground">Updated</span>
							<p class="font-medium">{agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : 'Never'}</p>
						</div>
					</div>

					<div>
						<span class="text-muted-foreground text-sm">Capabilities</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each agent.capabilities as capability}
								<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
									{capability}
								</span>
							{:else}
								<span class="text-muted-foreground text-sm">None</span>
							{/each}
						</div>
					</div>

					{#if agent.dockerInfo}
						<div class="pt-4 border-t">
							<h4 class="font-medium mb-3">Docker Information</h4>
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span class="text-muted-foreground">Docker Version</span>
									<p class="font-medium">{agent.dockerInfo.version}</p>
								</div>
								<div>
									<span class="text-muted-foreground">Containers</span>
									<p class="font-medium">{agent.dockerInfo.containers}</p>
								</div>
								<div>
									<span class="text-muted-foreground">Images</span>
									<p class="font-medium">{agent.dockerInfo.images}</p>
								</div>
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Recent Tasks -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Recent Tasks</Card.Title>
						<Button variant="outline" size="sm" onclick={loadAgentTasks}>
							<RefreshCw class="size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if tasks.length > 0}
						<div class="space-y-3 max-h-96 overflow-y-auto">
							{#each tasks.slice(0, 10) as task}
								<div class="border rounded-lg p-3">
									<div class="flex items-center justify-between mb-2">
										<div class="flex items-center gap-2">
											<p class="font-medium text-sm">{task.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</p>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getTaskStatusClasses(task.status)}">
												{task.status}
											</span>
										</div>
										<p class="text-xs text-muted-foreground">
											{formatDistanceToNow(new Date(task.createdAt))} ago
										</p>
									</div>

									<!-- Show command details -->
									{#if task.payload?.command}
										<div class="text-xs text-muted-foreground mb-2">
											<code class="bg-muted px-1 rounded">
												{task.payload.command}
												{#if task.payload.args?.length > 0}
													{task.payload.args.join(' ')}
												{/if}
											</code>
										</div>
									{/if}

									<!-- Show results for completed tasks -->
									{#if task.status === 'completed' && task.result}
										<details class="mt-2">
											<summary class="cursor-pointer text-xs text-green-600 hover:text-green-500"> View Output </summary>
											<div class="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
												{typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
											</div>
										</details>
									{/if}

									<!-- Show errors for failed tasks -->
									{#if task.error}
										<details class="mt-2">
											<summary class="cursor-pointer text-xs text-red-600 hover:text-red-500"> View Error </summary>
											<div class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400 max-h-32 overflow-y-auto">
												{task.error}
											</div>
										</details>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-8 text-muted-foreground">
							<Activity class="size-12 mx-auto mb-4 opacity-50" />
							<p>No tasks executed yet</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Connection Status Banner -->
		{#if agent && !canSendCommands(agent)}
			<Alert.Root variant="destructive">
				<AlertCircle class="size-4" />
				<Alert.Title>Agent Offline</Alert.Title>
				<Alert.Description>This agent is not currently connected. Commands cannot be sent until the agent reconnects.</Alert.Description>
			</Alert.Root>
		{/if}
	{/if}
</div>

<!-- Send Command Dialog -->
<Dialog.Root bind:open={commandDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Send Command to Agent</Dialog.Title>
			<Dialog.Description>
				Execute a command on {agent?.hostname}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4">
			<div>
				<Label for="command-select">Command</Label>
				<Select.Root type="single" value={selectedCommand?.value} onValueChange={(v) => (selectedCommand = predefinedCommands.find((cmd) => cmd.value === v))}>
					<Select.Trigger>
						<span>{selectedCommand?.label || 'Select a command'}</span>
					</Select.Trigger>
					<Select.Content>
						{#each predefinedCommands as command}
							<Select.Item value={command.value}>{command.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			{#if selectedCommand?.value === 'custom'}
				<div>
					<Label for="custom-command">Custom Command</Label>
					<Input id="custom-command" bind:value={customCommand} placeholder="docker ps -a" disabled={taskExecuting} />
				</div>
			{/if}

			{#if selectedCommand && selectedCommand.value !== 'agent_upgrade'}
				<div>
					<Label for="command-args">Additional Arguments (optional)</Label>
					<Input id="command-args" bind:value={commandArgs} placeholder="--format table" disabled={taskExecuting} />
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (commandDialogOpen = false)} disabled={taskExecuting}>Cancel</Button>
			<Button onclick={sendCommand} disabled={!selectedCommand || taskExecuting}>
				{#if taskExecuting}
					<RefreshCw class="size-4 mr-2 animate-spin" />
					Sending...
				{:else}
					<Play class="size-4 mr-2" />
					Send Command
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
