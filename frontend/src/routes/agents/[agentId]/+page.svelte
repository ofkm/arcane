<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import type { Agent, AgentTask } from '$lib/types/agent.type';
	import type { CreateTaskDTO, DockerCommandDTO, StackDeployDTO, ImagePullDTO, AgentUpgradeDTO } from '$lib/dto/agent-dto';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import DropdownCard from '$lib/components/dropdown-card.svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import AgentTokensDialog from '$lib/components/dialogs/agent-tokens-dialog.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Monitor, Terminal, Clock, Settings, Activity, AlertCircle, Server, RefreshCw, Play, ArrowLeft, Container, HardDrive, Layers, Network, Database, Loader2, Download, Trash2, Key } from '@lucide/svelte';
	import ImagePullForm from '$lib/components/forms/ImagePullForm.svelte';
	import StackDeploymentForm from '$lib/components/forms/StackDeploymentForm.svelte';
	import QuickContainerForm from '$lib/components/forms/QuickContainerForm.svelte';
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

	let resourcesLoading = $state(false);
	let resourcesError = $state('');
	let resourcesData = $state<{
		containers: any[];
		images: any[];
		networks: any[];
		volumes: any[];
		stacks: any[];
	}>({
		containers: [],
		images: [],
		networks: [],
		volumes: [],
		stacks: []
	});

	let selectedCommand = $state<{ value: string; label: string } | undefined>(undefined);
	let commandArgs = $state('');
	let customCommand = $state('');

	let commandDialogOpen = $state(false);
	let taskExecuting = $state(false);

	let deployDialogOpen = $state(false);
	let imageDialogOpen = $state(false);
	let containerDialogOpen = $state(false);
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

	async function loadResourcesData() {
		if (!agent || agent.status !== 'online') {
			resourcesError = 'Agent must be online to load resource data';
			return;
		}

		resourcesLoading = true;
		resourcesError = '';

		try {
			const commands: CreateTaskDTO[] = [
				{ type: 'docker_command', payload: { command: 'ps', args: ['-a', '--format', 'json'] } as DockerCommandDTO },
				{ type: 'docker_command', payload: { command: 'images', args: ['--format', 'json'] } as DockerCommandDTO },
				{ type: 'docker_command', payload: { command: 'network', args: ['ls', '--format', 'json'] } as DockerCommandDTO },
				{ type: 'docker_command', payload: { command: 'volume', args: ['ls', '--format', 'json'] } as DockerCommandDTO },
				{ type: 'docker_command', payload: { command: 'compose', args: ['ls', '--format', 'json'] } as DockerCommandDTO }
			];

			const results = await Promise.allSettled(
				commands.map(async (cmd, index) => {
					const task = await agentAPI.createTask(agentId, cmd);
					return pollTaskCompletion(task.id, ['containers', 'images', 'networks', 'volumes', 'stacks'][index]);
				})
			);

			const newResourcesData = {
				containers: [] as any[],
				images: [] as any[],
				networks: [] as any[],
				volumes: [] as any[],
				stacks: [] as any[]
			};

			results.forEach((result, index) => {
				if (result.status === 'fulfilled' && result.value) {
					const resourceType = ['containers', 'images', 'networks', 'volumes', 'stacks'][index] as keyof typeof newResourcesData;
					newResourcesData[resourceType] = result.value;
				}
			});

			resourcesData = newResourcesData;
		} catch (err) {
			console.error('Failed to load resources data:', err);
			resourcesError = err instanceof Error ? err.message : 'Failed to load resource data';
			toast.error('Failed to load resource data');
		} finally {
			resourcesLoading = false;
		}
	}

	async function pollTaskCompletion(taskId: string, resourceType: string): Promise<any[]> {
		const maxAttempts = 30;
		const delay = 1000;

		for (let i = 0; i < maxAttempts; i++) {
			await new Promise((resolve) => setTimeout(resolve, delay));

			try {
				const task = await agentAPI.getTask(taskId);

				if (task.status === 'completed') {
					if (!task.result) {
						return [];
					}

					let data: any[] = [];
					let outputString = '';

					if (task.result && typeof task.result === 'object' && task.result.output) {
						outputString = task.result.output;
					} else if (typeof task.result === 'string') {
						outputString = task.result;
					} else {
						return [];
					}

					if (outputString) {
						try {
							const parsed = JSON.parse(outputString);
							if (Array.isArray(parsed)) {
								data = parsed;
							} else {
								data.push(parsed);
							}
						} catch (parseError) {
							const lines = outputString.split('\n').filter((line: string) => line.trim());
							for (const line of lines) {
								try {
									const parsed = JSON.parse(line.trim());
									data.push(parsed);
								} catch (lineParseError) {}
							}
						}
					}
					return data;
				} else if (task.status === 'failed') {
					throw new Error(task.error || 'Task failed');
				}
			} catch (err) {
				console.error(`Error polling task ${taskId}:`, err);
			}
		}

		throw new Error(`Task ${taskId} timed out after ${maxAttempts} seconds`);
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

	async function handleStackDeploy(data: StackDeployDTO) {
		try {
			const taskDto: CreateTaskDTO = {
				type: 'stack_deploy',
				payload: data
			};
			await agentAPI.createTask(agentId, taskDto);
			toast.success('Stack deployment started');
			setTimeout(() => refreshAgentData(), 1000);
		} catch (err) {
			console.error('Stack deploy error:', err);
			throw err;
		}
	}

	async function handleImagePull(imageName: string) {
		try {
			const imageDto: ImagePullDTO = { imageName };
			const taskDto: CreateTaskDTO = {
				type: 'image_pull',
				payload: imageDto
			};
			await agentAPI.createTask(agentId, taskDto);
			toast.success('Image pull started');
		} catch (err) {
			console.error('Image pull error:', err);
			throw err;
		}
	}

	async function handleContainerRun(data: any) {
		try {
			const taskDto: CreateTaskDTO = {
				type: 'container_start',
				payload: data
			};
			await agentAPI.createTask(agentId, taskDto);
			toast.success('Container started');
		} catch (err) {
			console.error('Container run error:', err);
			throw err;
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
			<DropdownCard id="agent-metrics" title="Resource Metrics" description="View detailed Docker resource information" defaultExpanded={false} icon={Activity}>
				<div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
					<div class="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
						<Container class="mx-auto mb-1 size-6 text-blue-600 dark:text-blue-400" />
						<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
							{agent.metrics.containerCount ?? 0}
						</p>
						<p class="text-sm text-blue-600/80 dark:text-blue-400/80">Containers</p>
					</div>
					<div class="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
						<HardDrive class="mx-auto mb-1 size-6 text-green-600 dark:text-green-400" />
						<p class="text-2xl font-bold text-green-600 dark:text-green-400">
							{agent.metrics.imageCount ?? 0}
						</p>
						<p class="text-sm text-green-600/80 dark:text-green-400/80">Images</p>
					</div>
					<div class="rounded-lg bg-orange-50 p-3 text-center dark:bg-orange-900/20">
						<Network class="mx-auto mb-1 size-6 text-orange-600 dark:text-orange-400" />
						<p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
							{agent.metrics.networkCount ?? 0}
						</p>
						<p class="text-sm text-orange-600/80 dark:text-orange-400/80">Networks</p>
					</div>
					<div class="rounded-lg bg-cyan-50 p-3 text-center dark:bg-cyan-900/20">
						<Database class="mx-auto mb-1 size-6 text-cyan-600 dark:text-cyan-400" />
						<p class="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
							{agent.metrics.volumeCount ?? 0}
						</p>
						<p class="text-sm text-cyan-600/80 dark:text-cyan-400/80">Volumes</p>
					</div>
				</div>

				{#if agent.status === 'online'}
					<div class="border-border space-y-4 border-t pt-4">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="mb-1 font-medium">Resource Details</h4>
								<p class="text-muted-foreground text-sm">View detailed information about Docker resources</p>
							</div>
							<Button variant="outline" size="sm" onclick={loadResourcesData} disabled={resourcesLoading}>
								{#if resourcesLoading}
									<Loader2 class="mr-2 size-4 animate-spin" />
									Loading...
								{:else}
									<RefreshCw class="mr-2 size-4" />
									Load Resources
								{/if}
							</Button>
						</div>

						{#if resourcesError}
							<Alert.Root variant="destructive">
								<AlertCircle class="size-4" />
								<Alert.Title>Error Loading Resources</Alert.Title>
								<Alert.Description>{resourcesError}</Alert.Description>
							</Alert.Root>
						{/if}

						{#if resourcesData.containers.length > 0 || resourcesData.images.length > 0 || resourcesData.networks.length > 0 || resourcesData.volumes.length > 0 || resourcesData.stacks.length > 0}
							<Tabs.Root value="containers" class="w-full">
								<Tabs.List class="grid w-full grid-cols-5">
									<Tabs.Trigger value="containers" class="flex items-center gap-2">
										<Container class="size-4" />
										Containers ({resourcesData.containers.length})
									</Tabs.Trigger>
									<Tabs.Trigger value="images" class="flex items-center gap-2">
										<HardDrive class="size-4" />
										Images ({resourcesData.images.length})
									</Tabs.Trigger>
									<Tabs.Trigger value="networks" class="flex items-center gap-2">
										<Network class="size-4" />
										Networks ({resourcesData.networks.length})
									</Tabs.Trigger>
									<Tabs.Trigger value="volumes" class="flex items-center gap-2">
										<Database class="size-4" />
										Volumes ({resourcesData.volumes.length})
									</Tabs.Trigger>
									<Tabs.Trigger value="stacks" class="flex items-center gap-2">
										<Layers class="size-4" />
										Compose Projects ({resourcesData.stacks.length})
									</Tabs.Trigger>
								</Tabs.List>

								<Tabs.Content value="containers" class="mt-4">
									{#if resourcesData.containers.length > 0}
										<UniversalTable
											data={resourcesData.containers}
											columns={[
												{ accessorKey: 'Names', header: 'Name' },
												{ accessorKey: 'Image', header: 'Image' },
												{ accessorKey: 'Status', header: 'Status' },
												{ accessorKey: 'Ports', header: 'Ports' },
												{ accessorKey: 'CreatedAt', header: 'Created' }
											]}
											idKey="ID"
											features={{ selection: false }}
											display={{
												filterPlaceholder: 'Search containers...',
												noResultsMessage: 'No containers found'
											}}
											pagination={{ pageSize: 10 }}
										/>
									{:else}
										<div class="text-muted-foreground py-8 text-center">
											<Container class="mx-auto mb-4 size-12 opacity-50" />
											<p>No containers found</p>
										</div>
									{/if}
								</Tabs.Content>

								<Tabs.Content value="images" class="mt-4">
									{#if resourcesData.images.length > 0}
										<UniversalTable
											data={resourcesData.images}
											columns={[
												{ accessorKey: 'Repository', header: 'Repository' },
												{ accessorKey: 'Tag', header: 'Tag' },
												{ accessorKey: 'ID', header: 'Image ID' },
												{ accessorKey: 'CreatedAt', header: 'Created' },
												{ accessorKey: 'Size', header: 'Size' }
											]}
											idKey="ID"
											features={{ selection: false }}
											display={{
												filterPlaceholder: 'Search images...',
												noResultsMessage: 'No images found'
											}}
											pagination={{ pageSize: 10 }}
										/>
									{:else}
										<div class="text-muted-foreground py-8 text-center">
											<HardDrive class="mx-auto mb-4 size-12 opacity-50" />
											<p>No images found</p>
										</div>
									{/if}
								</Tabs.Content>

								<Tabs.Content value="networks" class="mt-4">
									{#if resourcesData.networks.length > 0}
										<UniversalTable
											data={resourcesData.networks}
											columns={[
												{ accessorKey: 'Name', header: 'Name' },
												{ accessorKey: 'Driver', header: 'Driver' },
												{ accessorKey: 'Scope', header: 'Scope' },
												{ accessorKey: 'ID', header: 'Network ID' },
												{ accessorKey: 'CreatedAt', header: 'Created' }
											]}
											idKey="ID"
											features={{ selection: false }}
											display={{
												filterPlaceholder: 'Search networks...',
												noResultsMessage: 'No networks found'
											}}
											pagination={{ pageSize: 10 }}
										/>
									{:else}
										<div class="text-muted-foreground py-8 text-center">
											<Network class="mx-auto mb-4 size-12 opacity-50" />
											<p>No networks found</p>
										</div>
									{/if}
								</Tabs.Content>

								<Tabs.Content value="volumes" class="mt-4">
									{#if resourcesData.volumes.length > 0}
										<UniversalTable
											data={resourcesData.volumes}
											columns={[
												{ accessorKey: 'Name', header: 'Name' },
												{ accessorKey: 'Driver', header: 'Driver' },
												{ accessorKey: 'Mountpoint', header: 'Mountpoint' },
												{ accessorKey: 'CreatedAt', header: 'Created' }
											]}
											idKey="Name"
											features={{ selection: false }}
											display={{
												filterPlaceholder: 'Search volumes...',
												noResultsMessage: 'No volumes found'
											}}
											pagination={{ pageSize: 10 }}
										/>
									{:else}
										<div class="text-muted-foreground py-8 text-center">
											<Database class="mx-auto mb-4 size-12 opacity-50" />
											<p>No volumes found</p>
										</div>
									{/if}
								</Tabs.Content>

								<Tabs.Content value="stacks" class="mt-4">
									{#if resourcesData.stacks.length > 0}
										<UniversalTable
											data={resourcesData.stacks}
											columns={[
												{ accessorKey: 'Name', header: 'Project Name' },
												{ accessorKey: 'Status', header: 'Status' },
												{ accessorKey: 'ConfigFiles', header: 'Config Files' }
											]}
											idKey="Name"
											features={{ selection: false }}
											display={{
												filterPlaceholder: 'Search compose projects...',
												noResultsMessage: 'No compose projects found'
											}}
											pagination={{ pageSize: 10 }}
										/>
									{:else}
										<div class="text-muted-foreground py-8 text-center">
											<Layers class="mx-auto mb-4 size-12 opacity-50" />
											<p>No compose projects found</p>
										</div>
									{/if}
								</Tabs.Content>
							</Tabs.Root>
						{:else}
							<div class="text-muted-foreground py-8 text-center">
								<Database class="mx-auto mb-4 size-12 opacity-50" />
								<p class="font-medium">No Resource Data Loaded</p>
								<p class="text-sm">Click "Load Resources" to fetch Docker resource information</p>
							</div>
						{/if}
					</div>
				{/if}

				{#if agent.status === 'online'}
					<div class="border-border space-y-4 border-t pt-4">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="mb-1 font-medium">Deploy Resources</h4>
								<p class="text-muted-foreground text-sm">Deploy stacks, containers, or images to this agent</p>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<Card.Root class="hover:border-primary/50 cursor-pointer transition-colors" onclick={() => (deployDialogOpen = true)}>
								<Card.Content class="p-4">
									<div class="flex items-center space-x-3">
										<div class="rounded-lg bg-blue-500/10 p-2">
											<Layers class="size-5 text-blue-500" />
										</div>
										<div>
											<h5 class="font-medium">Deploy Stack</h5>
											<p class="text-muted-foreground text-sm">Deploy a complete application stack</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>

							<Card.Root class="hover:border-primary/50 cursor-pointer transition-colors" onclick={() => (imageDialogOpen = true)}>
								<Card.Content class="p-4">
									<div class="flex items-center space-x-3">
										<div class="rounded-lg bg-green-500/10 p-2">
											<Download class="size-5 text-green-500" />
										</div>
										<div>
											<h5 class="font-medium">Pull Image</h5>
											<p class="text-muted-foreground text-sm">Download a Docker image</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>

							<Card.Root class="hover:border-primary/50 cursor-pointer transition-colors" onclick={() => (containerDialogOpen = true)}>
								<Card.Content class="p-4">
									<div class="flex items-center space-x-3">
										<div class="rounded-lg bg-purple-500/10 p-2">
											<Container class="size-5 text-purple-500" />
										</div>
										<div>
											<h5 class="font-medium">Run Container</h5>
											<p class="text-muted-foreground text-sm">Start a single container</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						</div>
					</div>
				{/if}
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

<Dialog.Root bind:open={deployDialogOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Deploy Stack to {agent?.hostname}</Dialog.Title>
			<Dialog.Description>Choose a stack to deploy or create a new one</Dialog.Description>
		</Dialog.Header>

		<StackDeploymentForm {agentId} onClose={() => (deployDialogOpen = false)} onDeploy={handleStackDeploy} />
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={imageDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Pull Image to {agent?.hostname}</Dialog.Title>
			<Dialog.Description>Enter the image name to download</Dialog.Description>
		</Dialog.Header>

		<ImagePullForm {agentId} onClose={() => (imageDialogOpen = false)} onPull={handleImagePull} />
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={containerDialogOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Run Container on {agent?.hostname}</Dialog.Title>
			<Dialog.Description>Quickly start a container from an image</Dialog.Description>
		</Dialog.Header>

		<QuickContainerForm {agentId} onClose={() => (containerDialogOpen = false)} onRun={handleContainerRun} />
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
