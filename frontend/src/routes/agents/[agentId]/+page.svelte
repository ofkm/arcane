<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import type { Agent, AgentTask } from '$lib/types/agent.type';
	import type { CreateTaskDTO, DockerCommandDTO, AgentUpgradeDTO } from '$lib/dto/agent-dto';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import DropdownCard from '$lib/components/dropdown-card.svelte';
	import AgentTokensDialog from '$lib/components/dialogs/agent-tokens-dialog.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Monitor, Terminal, Clock, Settings, Activity, AlertCircle, Server, RefreshCw, Play, ArrowLeft, Container, HardDrive, Network, Database, Trash2, Key } from '@lucide/svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util.js';
	import { tryCatch } from '$lib/utils/try-catch.js';
	import { agentAPI } from '$lib/services/api';

	let { data } = $props();

	let agent: Agent | null = $state(data.agent as Agent);
	let tasks: AgentTask[] = $state(data.tasks);
	let agentId = data.agentId;

	let loading = $state(false);
	let error = $state('');

	let selectedCommand = $state<{ value: string; label: string } | undefined>(undefined);
	let commandArgs = $state('');
	let customCommand = $state('');

	let commandDialogOpen = $state(false);
	let taskExecuting = $state(false);
	let tokensDialogOpen = $state(false);

	let deleting = $state(false);

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
		const interval = setInterval(() => {
			refreshAgentData();
		}, 10000);
		return () => clearInterval(interval);
	});

	async function refreshAgentData() {
		if (loading) return;

		try {
			loading = true;

			const [agentResponse, tasksResponse] = await Promise.allSettled([agentAPI.get(agentId), agentAPI.getTasks(agentId)]);

			if (agentResponse.status === 'fulfilled') {
				agent = agentResponse.value;
			}

			if (tasksResponse.status === 'fulfilled') {
				tasks = tasksResponse.value;
			}

			error = '';
		} catch (err) {
			console.error('Failed to refresh agent data:', err);
		} finally {
			loading = false;
		}
	}

	async function sendCommand() {
		if (!selectedCommand || taskExecuting) return;

		taskExecuting = true;
		try {
			let taskDto: CreateTaskDTO;

			switch (selectedCommand.value) {
				case 'docker_version':
					taskDto = {
						type: 'docker_command',
						payload: { command: 'version', args: [] } as DockerCommandDTO
					};
					break;
				case 'docker_info':
					taskDto = {
						type: 'docker_command',
						payload: { command: 'info', args: [] } as DockerCommandDTO
					};
					break;
				case 'docker_ps':
					taskDto = {
						type: 'docker_command',
						payload: { command: 'ps', args: ['-a'] } as DockerCommandDTO
					};
					break;
				case 'docker_images':
					taskDto = {
						type: 'docker_command',
						payload: { command: 'images', args: [] } as DockerCommandDTO
					};
					break;
				case 'system_info':
					taskDto = {
						type: 'docker_command',
						payload: { command: 'system', args: ['info'] } as DockerCommandDTO
					};
					break;
				case 'agent_upgrade':
					taskDto = {
						type: 'agent_upgrade',
						payload: { action: 'upgrade', version: 'latest' } as AgentUpgradeDTO
					};
					break;
				case 'docker_prune':
					taskDto = {
						type: 'docker_command',
						payload: { command: 'system', args: ['prune', '-f'] } as DockerCommandDTO
					};
					break;
				case 'custom':
					if (!customCommand.trim()) {
						toast.error('Please enter a custom command');
						return;
					}
					const parts = customCommand.trim().split(' ');
					const args = parts.slice(1);
					if (commandArgs.trim()) {
						args.push(...commandArgs.split(' '));
					}
					taskDto = {
						type: 'docker_command',
						payload: { command: parts[0], args } as DockerCommandDTO
					};
					break;
				default:
					throw new Error('Invalid command selected');
			}

			await agentAPI.createTask(agentId, taskDto);

			toast.success('Command sent successfully');
			commandDialogOpen = false;

			selectedCommand = undefined;
			commandArgs = '';
			customCommand = '';

			setTimeout(refreshAgentData, 1000);
		} catch (err) {
			console.error('Failed to send command:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to send command');
		} finally {
			taskExecuting = false;
		}
	}

	async function deleteAgentHandler() {
		if (!agent || deleting) return;

		openConfirmDialog({
			title: `Confirm Removal`,
			message: `Are you sure you want to remove this Agent? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(agentAPI.delete(agentId)),
						setLoadingState: (value) => (deleting = value),
						message: 'Failed to Remove Agent',
						onSuccess: async () => {
							toast.success('Agent Removed Successfully');
							await invalidateAll();
							goto('/agents');
						}
					});
				}
			}
		});
	}

	function getStatusClasses(agent: Agent) {
		if (agent.status === 'online') return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
		return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
	}

	function getStatusText(agent: Agent) {
		if (agent.status === 'online') return 'Online';
		return 'Offline';
	}

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

	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				{agent?.hostname || 'Agent Details'}
			</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				{agent ? `Agent ID: ${agent.id}` : 'Loading agent information...'}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={() => goto('/agents')}>
				<ArrowLeft class="mr-2 size-4" />
				Back to Agents
			</Button>
			{#if agent}
				<Button variant="outline" onclick={() => (tokensDialogOpen = true)}>
					<Key class="mr-2 size-4" />
					Manage Tokens
				</Button>
				<Button variant="destructive" onclick={deleteAgentHandler} disabled={deleting}>
					<Trash2 class="mr-2 size-4" />
					Delete Agent
				</Button>
				{#if agent.status === 'online'}
					<Button onclick={() => (commandDialogOpen = true)} disabled={taskExecuting}>
						<Terminal class="mr-2 size-4" />
						Send Command
					</Button>
				{/if}
			{/if}
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{:else if agent}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Content class="flex items-center space-x-3 p-4">
					<div class="rounded-full bg-blue-500/10 p-2">
						<Server class="size-5 text-blue-500" />
					</div>
					<div>
						<p class="text-muted-foreground text-sm font-medium">Status</p>
						<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getStatusClasses(agent)}">
							{getStatusText(agent)}
						</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex items-center space-x-3 p-4">
					<div class="rounded-full bg-green-500/10 p-2">
						<Monitor class="size-5 text-green-500" />
					</div>
					<div>
						<p class="text-muted-foreground text-sm font-medium">Platform</p>
						<p class="font-semibold capitalize">{agent.platform}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex items-center space-x-3 p-4">
					<div class="rounded-full bg-purple-500/10 p-2">
						<Settings class="size-5 text-purple-500" />
					</div>
					<div>
						<p class="text-muted-foreground text-sm font-medium">Version</p>
						<p class="font-semibold">{agent.version}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex items-center space-x-3 p-4">
					<div class="rounded-full bg-amber-500/10 p-2">
						<Clock class="size-5 text-amber-500" />
					</div>
					<div>
						<p class="text-muted-foreground text-sm font-medium">Last Seen</p>
						<p class="text-sm font-semibold">{formatDistanceToNow(new Date(agent.lastSeen))} ago</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		{#if agent.metrics}
			<DropdownCard id="agent-metrics" title="Resource Metrics" description="View Docker resource metrics from the agent" defaultExpanded={true} icon={Activity}>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
					<div class="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
						<Container class="mx-auto mb-2 size-8 text-blue-600 dark:text-blue-400" />
						<p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
							{agent.metrics.containerCount ?? 0}
						</p>
						<p class="text-sm text-blue-600/80 dark:text-blue-400/80">Containers</p>
					</div>
					<div class="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
						<HardDrive class="mx-auto mb-2 size-8 text-green-600 dark:text-green-400" />
						<p class="text-3xl font-bold text-green-600 dark:text-green-400">
							{agent.metrics.imageCount ?? 0}
						</p>
						<p class="text-sm text-green-600/80 dark:text-green-400/80">Images</p>
					</div>
					<div class="rounded-lg bg-orange-50 p-4 text-center dark:bg-orange-900/20">
						<Network class="mx-auto mb-2 size-8 text-orange-600 dark:text-orange-400" />
						<p class="text-3xl font-bold text-orange-600 dark:text-orange-400">
							{agent.metrics.networkCount ?? 0}
						</p>
						<p class="text-sm text-orange-600/80 dark:text-orange-400/80">Networks</p>
					</div>
					<div class="rounded-lg bg-cyan-50 p-4 text-center dark:bg-cyan-900/20">
						<Database class="mx-auto mb-2 size-8 text-cyan-600 dark:text-cyan-400" />
						<p class="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
							{agent.metrics.volumeCount ?? 0}
						</p>
						<p class="text-sm text-cyan-600/80 dark:text-cyan-400/80">Volumes</p>
					</div>
					<div class="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20">
						<div class="mx-auto mb-2 size-8 text-purple-600 dark:text-purple-400">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-8">
								<rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
								<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
								<path d="m9 14 2 2 4-4" />
							</svg>
						</div>
						<p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
							{agent.metrics.stackCount ?? 0}
						</p>
						<p class="text-sm text-purple-600/80 dark:text-purple-400/80">Stacks</p>
					</div>
				</div>
			</DropdownCard>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
							<p class="font-medium">
								{agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : 'Never'}
							</p>
						</div>
					</div>

					<div>
						<span class="text-muted-foreground text-sm">Capabilities</span>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each agent.capabilities as capability}
								<span class="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
									{capability}
								</span>
							{:else}
								<span class="text-muted-foreground text-sm">None</span>
							{/each}
						</div>
					</div>

					{#if agent.dockerInfo}
						<div class="border-t pt-4">
							<h4 class="mb-3 font-medium">Docker Information</h4>
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

			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Recent Tasks</Card.Title>
						<Button variant="outline" size="sm" onclick={refreshAgentData}>
							<RefreshCw class="size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if tasks.length > 0}
						<div class="max-h-96 space-y-3 overflow-y-auto">
							{#each tasks.slice(0, 10) as task}
								<div class="rounded-lg border p-3">
									<div class="mb-2 flex items-center justify-between">
										<div class="flex items-center gap-2">
											<p class="text-sm font-medium">
												{task.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
											</p>
											<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getTaskStatusClasses(task.status)}">
												{task.status}
											</span>
										</div>
										<p class="text-muted-foreground text-xs">
											{formatDistanceToNow(new Date(task.createdAt))} ago
										</p>
									</div>

									{#if task.payload?.command}
										<div class="text-muted-foreground mb-2 text-xs">
											<code class="bg-muted rounded px-1">
												{task.payload.command}
												{#if task.payload.args?.length > 0}
													{task.payload.args.join(' ')}
												{/if}
											</code>
										</div>
									{/if}

									{#if task.status === 'completed' && task.result}
										<details class="mt-2">
											<summary class="cursor-pointer text-xs text-green-600 hover:text-green-500"> View Output </summary>
											<div class="bg-muted mt-2 max-h-32 overflow-y-auto rounded p-2 font-mono text-xs whitespace-pre-wrap">
												{typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
											</div>
										</details>
									{/if}

									{#if task.error}
										<details class="mt-2">
											<summary class="cursor-pointer text-xs text-red-600 hover:text-red-500"> View Error </summary>
											<div class="mt-2 max-h-32 overflow-y-auto rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
												{task.error}
											</div>
										</details>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-muted-foreground py-8 text-center">
							<Activity class="mx-auto mb-4 size-12 opacity-50" />
							<p>No tasks executed yet</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		{#if agent && !canSendCommands(agent)}
			<Alert.Root variant="destructive">
				<AlertCircle class="size-4" />
				<Alert.Title>Agent Offline</Alert.Title>
				<Alert.Description>This agent is not currently connected. Commands cannot be sent until the agent reconnects.</Alert.Description>
			</Alert.Root>
		{/if}
	{/if}
</div>

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
					<RefreshCw class="mr-2 size-4 animate-spin" />
					Sending...
				{:else}
					<Play class="mr-2 size-4" />
					Send Command
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={tokensDialogOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Manage Agent Tokens</Dialog.Title>
			<Dialog.Description>Create and manage authentication tokens for {agent?.hostname}</Dialog.Description>
		</Dialog.Header>

		<AgentTokensDialog {agentId} />

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (tokensDialogOpen = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
