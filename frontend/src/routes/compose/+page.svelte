<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertCircle, Layers, FileStack, Loader2, Play, RotateCcw, StopCircle, Trash2, Ellipsis, Pen, Inspect } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { statusVariantMap } from '$lib/types/statuses';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { StackActions } from '$lib/types/actions.type';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import { formatRelativeTime, formatFriendlyDate } from '$lib/utils/date.utils';

	let { data }: { data: PageData } = $props();
	let stacks = $derived(data.stacks);
	let agents = $derived(data.agents || []);
	let loadingAgentStacks = $state(false);

	const isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		import: false,
		redeploy: false,
		destroy: false,
		pull: false,
		migrate: false
	});
	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	const stackApi = new StackAPIService();

	const allStacks = $derived(stacks);
	const totalStacks = $derived(allStacks?.length || 0);
	const runningStacks = $derived(allStacks?.filter((s) => s.status === 'running').length || 0);
	const partialStacks = $derived(allStacks?.filter((s) => s.status === 'partially running').length || 0);

	// Add this variable to track loading state for remote stack actions
	let isRemoteActionLoading = $state<string | null>(null);

	async function performStackAction(action: StackActions, id: string) {
		isLoading[action] = true;

		if (action === 'start') {
			handleApiResultWithCallbacks({
				result: await tryCatch(stackApi.deploy(id)),
				message: 'Failed to Start Stack',
				setLoadingState: (value) => (isLoading.start = value),
				onSuccess: async () => {
					toast.success('Stack Started Successfully.');
					await invalidateAll();
				}
			});
		} else if (action === 'stop') {
			handleApiResultWithCallbacks({
				result: await tryCatch(stackApi.down(id)),
				message: 'Failed to Stop Stack',
				setLoadingState: (value) => (isLoading.stop = value),
				onSuccess: async () => {
					toast.success('Stack Stopped Successfully.');
					await invalidateAll();
				}
			});
		} else if (action === 'restart') {
			handleApiResultWithCallbacks({
				result: await tryCatch(stackApi.restart(id)),
				message: 'Failed to Restart Stack',
				setLoadingState: (value) => (isLoading.restart = value),
				onSuccess: async () => {
					toast.success('Stack Restarted Successfully.');
					await invalidateAll();
				}
			});
		} else if (action === 'redeploy') {
			handleApiResultWithCallbacks({
				result: await tryCatch(stackApi.redeploy(id)),
				message: 'Failed to Redeploy Stack',
				setLoadingState: (value) => (isLoading.redeploy = value),
				onSuccess: async () => {
					toast.success('Stack redeployed successfully.');
					await invalidateAll();
				}
			});
		} else if (action === 'pull') {
			handleApiResultWithCallbacks({
				result: await tryCatch(stackApi.pull(id)),
				message: 'Failed to pull Stack',
				setLoadingState: (value) => (isLoading.pull = value),
				onSuccess: async () => {
					toast.success('Stack Pulled successfully.');
					await invalidateAll();
				}
			});
		} else if (action === 'destroy') {
			openConfirmDialog({
				title: `Confirm Removal`,
				message: `Are you sure you want to remove this Stack? This action cannot be undone.`,
				confirm: {
					label: 'Remove',
					destructive: true,
					action: async () => {
						handleApiResultWithCallbacks({
							result: await tryCatch(stackApi.destroy(id)),
							message: 'Failed to Remove Stack',
							setLoadingState: (value) => (isLoading.destroy = value),
							onSuccess: async () => {
								toast.success('Stack Removed Successfully');
								await invalidateAll();
							}
						});
					}
				}
			});
		} else if (action === 'migrate') {
			handleApiResultWithCallbacks({
				result: await tryCatch(stackApi.migrate(id)),
				message: 'Failed to Migrate Stack',
				setLoadingState: (value) => (isLoading.migrate = value),
				onSuccess: async () => {
					toast.success('Stack Migrated Successfully.');
					await invalidateAll();
				}
			});
		} else {
			console.error('An Unknown Error Occurred');
			toast.error('An Unknown Error Occurred');
		}
	}

	async function handleImportStack(id: string, name: string) {
		isLoading['import'] = true;
		const result = await tryCatch(stackApi.import(id, name));
		if (result.error) {
			console.error(`Failed to import Stack ${id}:`, result.error);
			toast.error(`Failed to import Stack: ${result.error.message}`);
			isLoading['import'] = false;
			return;
		}
		toast.success('Stack Imported successfully.');
		await invalidateAll();
		isLoading['import'] = false;
	}

	async function handleRemoveRemoteStack(agentId: string, stackName: string) {
		openConfirmDialog({
			title: `Confirm Stack Removal`,
			message: `Are you sure you want to remove the stack "${stackName}" from agent "${agentId}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isRemoteActionLoading = `${agentId}:${stackName}:remove`;

					try {
						// Send the stack_destroy task to the agent
						const response = await fetch(`/api/agents/${agentId}/tasks`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								type: 'stack_destroy',
								payload: {
									project_name: stackName
								}
							})
						});

						if (!response.ok) {
							const errorData = await response.json();
							throw new Error(errorData.error || 'Failed to remove stack');
						}

						toast.success(`Stack ${stackName} destroyed successfully`);
						await invalidateAll();
					} catch (error) {
						console.error(`Failed to remove remote stack:`, error);
						toast.error(`Failed to remove stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
					} finally {
						isRemoteActionLoading = null;
					}
				}
			}
		});
	}

	// Function to load stacks from agents
	async function loadAgentStacks() {
		if (agents.length === 0) return;

		loadingAgentStacks = true;
		try {
			const agentStackPromises = agents.map(async (agent) => {
				try {
					const response = await fetch(`/api/agents/${agent.id}/stacks`);
					if (!response.ok) throw new Error(`Failed to fetch stacks from ${agent.hostname}`);

					const data = await response.json();
					return (data.stacks || []).map((stack: any) => ({
						...stack,
						agentId: agent.id,
						agentHostname: agent.hostname,
						isRemote: true,
						id: `${agent.id}:${stack.Name || stack.id}`,
						name: stack.Name || stack.name,
						status: stack.Status?.toLowerCase() || 'unknown',
						serviceCount: stack.ServiceCount || 0,
						source: 'Remote',
						createdAt: stack.CreatedAt || new Date().toISOString()
					}));
				} catch (error) {
					console.error(`Failed to load stacks from agent ${agent.hostname}:`, error);
					return [];
				}
			});

			await invalidateAll();
			toast.success('Remote stacks refreshed');
		} catch (error) {
			console.error('Failed to load agent stacks:', error);
			toast.error('Failed to load some remote stacks');
		} finally {
			loadingAgentStacks = false;
		}
	}

	// Function to handle remote stack actions
	async function handleRemoteStackAction(agentId: string, stackName: string, action: 'up' | 'down' | 'restart' | 'pull' | 'remove') {
		const actionId = `${agentId}:${stackName}:${action}`;
		isRemoteActionLoading = actionId;

		try {
			let taskType: string;
			let payload: any;

			switch (action) {
				case 'up':
					taskType = 'compose_up';
					payload = { project_name: stackName };
					break;
				case 'down':
					taskType = 'compose_down';
					payload = { project_name: stackName };
					break;
				case 'restart':
					taskType = 'compose_restart';
					payload = { project_name: stackName };
					break;
				case 'remove':
					taskType = 'compose_remove';
					payload = { project_name: stackName };
					break;
				case 'pull':
					taskType = 'compose_pull';
					payload = { project_name: stackName };
					break;
			}

			// Send the task to the agent
			const response = await fetch(`/api/agents/${agentId}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: taskType,
					payload: payload
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to ${action} stack`);
			}

			const result = await response.json();
			const taskId = result.task?.id;

			if (!taskId) {
				throw new Error('No task ID returned from agent');
			}

			// Poll for task completion
			const pollTask = async (taskId: string): Promise<boolean> => {
				const maxAttempts = 30; // 30 seconds timeout
				const delay = 1000; // 1 second between polls

				for (let i = 0; i < maxAttempts; i++) {
					await new Promise((resolve) => setTimeout(resolve, delay));

					try {
						const taskResponse = await fetch(`/api/agents/${agentId}/tasks/${taskId}`);
						if (!taskResponse.ok) continue;

						const taskData = await taskResponse.json();
						const taskStatus = taskData.task?.status;

						if (taskStatus === 'completed') {
							return true;
						} else if (taskStatus === 'failed') {
							throw new Error(taskData.task?.error || 'Task failed');
						}
						// Continue polling if still pending/running
					} catch (pollError) {
						console.warn(`Polling attempt ${i + 1} failed:`, pollError);
					}
				}

				throw new Error('Task polling timed out');
			};

			// Wait for the task to complete
			await pollTask(taskId);

			// Handle pull action with follow-up
			if (action === 'pull') {
				toast.success(`Images pulled for ${stackName}`);

				// Execute the up command after pull
				const upResponse = await fetch(`/api/agents/${agentId}/tasks`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'compose_up',
						payload: { project_name: stackName }
					})
				});

				if (upResponse.ok) {
					const upResult = await upResponse.json();
					if (upResult.task?.id) {
						await pollTask(upResult.task.id);
					}
				}

				toast.success(`Stack ${stackName} redeployed with new images`);
			} else if (action === 'remove') {
				toast.success(`Compose Project ${stackName} destroyed successfully`);
			} else {
				toast.success(`Compose Project ${stackName} ${action === 'up' ? 'started' : action === 'down' ? 'stopped' : 'restarted'} successfully`);
			}

			// Refresh the list of stacks after the action actually completes
			await invalidateAll();
		} catch (error) {
			console.error(`Failed to ${action} remote Compose Project:`, error);
			toast.error(`Failed to ${action} stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isRemoteActionLoading = null;
		}
	}

	// // Load agent stacks on component mount
	// $effect(() => {
	// 	if (agents.length > 0) {
	// 		loadAgentStacks();
	// 	}
	// });
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Compose Projects</h1>
			<p class="text-sm text-muted-foreground mt-1">View and Manage Compose Projects</p>
		</div>
	</div>

	{#if data.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Compose Projects</Alert.Title>
			<Alert.Description>{data.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Compose Projects</p>
					<p class="text-2xl font-bold">{totalStacks}</p>
				</div>
				<div class="bg-primary/10 p-2 rounded-full">
					<FileStack class="text-primary size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Running</p>
					<p class="text-2xl font-bold">{runningStacks}</p>
				</div>
				<div class="bg-green-500/10 p-2 rounded-full">
					<Layers class="text-green-500 size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Partially Running</p>
					<p class="text-2xl font-bold">{partialStacks}</p>
				</div>
				<div class="bg-amber-500/10 p-2 rounded-full">
					<Layers class="text-amber-500 size-5" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Compose Projects List</Card.Title>
					{#if loadingAgentStacks}
						<p class="text-sm text-muted-foreground">Loading remote compose projects...</p>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if agents.length > 0}
						<Button variant="outline" size="sm" onclick={loadAgentStacks} disabled={loadingAgentStacks}>
							{#if loadingAgentStacks}
								<Loader2 class="size-4 animate-spin mr-2" />
							{/if}
							Refresh Remote
						</Button>
					{/if}
					<ArcaneButton action="create" customLabel="Create Compose Project" onClick={() => goto(`/compose/new`)} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if allStacks && allStacks.length > 0}
				<UniversalTable
					data={allStacks}
					columns={[
						{ accessorKey: 'name', header: 'Name' },
						{ accessorKey: 'serviceCount', header: 'Services' },
						{ accessorKey: 'status', header: 'Status' },
						{ accessorKey: 'source', header: 'Source' },
						{ accessorKey: 'createdAt', header: 'Created' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					features={{
						selection: false
					}}
					pagination={{
						pageSize: tablePersistence.getPageSize('stacks')
					}}
					onPageSizeChange={(newSize) => {
						tablePersistence.setPageSize('stacks', newSize);
					}}
					sort={{
						defaultSort: { id: 'name', desc: false }
					}}
					display={{
						filterPlaceholder: 'Search compose projects...',
						noResultsMessage: 'No stacks found'
					}}
				>
					{#snippet rows({ item })}
						{@const stateVariant = item.status ? statusVariantMap[item.status.toLowerCase()] : 'gray'}
						<Table.Cell>
							{#if item.isExternal}
								<div class="flex items-center gap-2">
									{item.name}
								</div>
							{:else}
								<div class="flex items-center gap-2">
									{#if item.isRemote}
										<a class="font-medium hover:underline" href="/compose/agent/{item.agentId}/{item.name}">
											{item.name}
										</a>
										<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
											On {item.agentId}
										</span>
									{:else}
										<a class="font-medium hover:underline" href="/compose/{item.id}/">
											{item.name}
										</a>
									{/if}
									{#if item.isLegacy}
										<span title="This stack uses the legacy layout. Migrate to the new layout from the dropdown menu." class="ml-1 flex items-center" style="filter: drop-shadow(0 0 4px #fbbf24);">
											<AlertCircle class="text-amber-400 animate-pulse size-4" />
										</span>
									{/if}
								</div>
							{/if}
						</Table.Cell>
						<Table.Cell>{item.serviceCount}</Table.Cell>
						<Table.Cell><StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.status)} /></Table.Cell>
						<Table.Cell>
							<StatusBadge variant={item.isExternal ? 'amber' : item.isRemote ? 'blue' : 'green'} text={item.isExternal ? 'External' : item.isRemote ? 'Remote' : 'Managed'} />
						</Table.Cell>
						<!-- Simple single line format -->
						<Table.Cell>{formatFriendlyDate(item.createdAt || '')}</Table.Cell>
						<Table.Cell>
							{#if item.isExternal}
								<ArcaneButton action="pull" customLabel="Import" onClick={() => handleImportStack(item.id, item.name)} loading={isLoading.import} disabled={isLoading.import} />
							{:else if item.isRemote}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
												<span class="sr-only">Open menu</span>
												<Ellipsis />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Group>
											<DropdownMenu.Item onclick={() => goto(`/compose/agent/${item.agentId}/${item.name}`)} disabled={!!isRemoteActionLoading}>
												<Pen class="size-4" />
												Edit
											</DropdownMenu.Item>

											{#if item.status !== 'running'}
												<DropdownMenu.Item onclick={() => handleRemoteStackAction(item.agentId || '', item.name, 'up')} disabled={!!isRemoteActionLoading}>
													{#if isRemoteActionLoading === `${item.agentId}:${item.name}:up`}
														<Loader2 class="animate-spin size-4" />
													{:else}
														<Play class="size-4" />
													{/if}
													Start
												</DropdownMenu.Item>
											{:else}
												<DropdownMenu.Item onclick={() => handleRemoteStackAction(item.agentId || '', item.name, 'restart')} disabled={!!isRemoteActionLoading}>
													{#if isRemoteActionLoading === `${item.agentId}:${item.name}:restart`}
														<Loader2 class="animate-spin size-4" />
													{:else}
														<RotateCcw class="size-4" />
													{/if}
													Restart
												</DropdownMenu.Item>

												<DropdownMenu.Item onclick={() => handleRemoteStackAction(item.agentId || '', item.name, 'down')} disabled={!!isRemoteActionLoading}>
													{#if isRemoteActionLoading === `${item.agentId}:${item.name}:down`}
														<Loader2 class="animate-spin size-4" />
													{:else}
														<StopCircle class="size-4" />
													{/if}
													Stop
												</DropdownMenu.Item>
											{/if}

											<DropdownMenu.Item onclick={() => handleRemoteStackAction(item.agentId || '', item.name, 'pull')} disabled={!!isRemoteActionLoading}>
												{#if isRemoteActionLoading === `${item.agentId}:${item.name}:pull`}
													<Loader2 class="animate-spin size-4" />
												{:else}
													<RotateCcw class="size-4" />
												{/if}
												Pull & Redeploy
											</DropdownMenu.Item>
											<DropdownMenu.Separator />

											<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => handleRemoveRemoteStack(item.agentId || '', item.name)} disabled={!!isRemoteActionLoading}>
												{#if isRemoteActionLoading}
													<Loader2 class="animate-spin size-4" />
												{:else}
													<Trash2 class="size-4" />
												{/if}
												Remove
											</DropdownMenu.Item>

											<DropdownMenu.Separator />

											<DropdownMenu.Item onclick={() => goto(`/agents/${item.agentId}`)}>
												<Inspect class="size-4" />
												View Agent
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{:else}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
												<span class="sr-only">Open menu</span>
												<Ellipsis />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Group>
											<DropdownMenu.Item onclick={() => goto(`/compose/${item.id}`)} disabled={isAnyLoading}>
												<Pen class="size-4" />
												Edit
											</DropdownMenu.Item>

											{#if item.status !== 'running'}
												<DropdownMenu.Item onclick={() => performStackAction('start', item.id)} disabled={isLoading.start || isAnyLoading}>
													{#if isLoading.start}
														<Loader2 class="animate-spin size-4" />
													{:else}
														<Play class="size-4" />
													{/if}
													Start
												</DropdownMenu.Item>
											{:else}
												<DropdownMenu.Item onclick={() => performStackAction('restart', item.id)} disabled={isLoading.restart || isAnyLoading}>
													{#if isLoading.restart}
														<Loader2 class="animate-spin size-4" />
													{:else}
														<RotateCcw class="size-4" />
													{/if}
													Restart
												</DropdownMenu.Item>

												<DropdownMenu.Item onclick={() => performStackAction('stop', item.id)} disabled={isLoading.stop || isAnyLoading}>
													{#if isLoading.stop}
														<Loader2 class="animate-spin size-4" />
													{:else}
														<StopCircle class="size-4" />
													{/if}
													Stop
												</DropdownMenu.Item>
											{/if}

											{#if item.isLegacy}
												<DropdownMenu.Item onclick={() => performStackAction('migrate', item.id)} class="text-amber-600 hover:text-amber-800 flex items-center">
													<span title="This stack uses the legacy layout. Migrate to the new layout." class="mr-2 flex items-center">
														<AlertCircle class="text-amber-500 size-4" />
													</span>
													Migrate
												</DropdownMenu.Item>
											{/if}

											<DropdownMenu.Separator />

											<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => performStackAction('destroy', item.id)} disabled={isLoading.remove || isAnyLoading}>
												{#if isLoading.remove}
													<Loader2 class="animate-spin size-4" />
												{:else}
													<Trash2 class="size-4" />
												{/if}
												Destroy
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</Table.Cell>
					{/snippet}
				</UniversalTable>
			{:else if !data.error}
				<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
					<FileStack class="text-muted-foreground mb-4 opacity-40 size-12" />
					<p class="text-lg font-medium">No stacks found</p>
					<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new stack using the "Create Stack" button above or import an existing compose file</p>
					<div class="flex gap-3 mt-4">
						<ArcaneButton action="create" customLabel="Create Stack" onClick={() => goto(`/compose/new`)} size="sm" />
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
