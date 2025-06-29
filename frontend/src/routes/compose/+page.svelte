<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		AlertCircle,
		Layers,
		FileStack,
		Loader2,
		Play,
		RotateCcw,
		StopCircle,
		Trash2,
		Ellipsis,
		Pen,
		PlayCircle
	} from '@lucide/svelte';
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
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { StackActions } from '$lib/types/actions.type';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import { autoUpdateAPI, environmentAPI } from '$lib/services/api';
	import { onMount } from 'svelte';
	import type { Stack } from '$lib/models/stack.type';
	import StatCard from '$lib/components/stat-card.svelte';

	let { data }: { data: PageData } = $props();

	let stacks = $state(<Stack[]>[]);
	let error = $state<string | null>(null);
	let isLoadingStacks = $state(true);

	const isLoading = $state<
		Record<'start' | 'stop' | 'restart' | 'remove' | 'destroy' | 'pull' | 'update', boolean>
	>({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		destroy: false,
		pull: false,
		update: false
	});
	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	const totalStacks = $derived(stacks.length);
	const runningStacks = $derived(stacks.filter((s) => s.status === 'running').length);
	const stoppedStacks = $derived(stacks.filter((s) => s.status === 'stopped').length);

	async function loadStacks() {
		try {
			isLoadingStacks = true;
			const response = await environmentAPI.getStacks();
			stacks = response || [];
			error = null;
		} catch (err) {
			console.error('Failed to load compose page:', err);
			error = err instanceof Error ? err.message : 'Failed to load Docker Compose stacks';
			stacks = [];
		} finally {
			isLoadingStacks = false;
		}
	}

	onMount(() => {
		loadStacks();
	});

	async function performStackAction(action: StackActions, id: string) {
		isLoading[action as keyof typeof isLoading] = true;

		try {
			if (action === 'start') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.startStack(id)),
					message: 'Failed to Start Stack',
					setLoadingState: (value) => (isLoading.start = value),
					onSuccess: async () => {
						toast.success('Stack Started Successfully.');
						await loadStacks();
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.downStack(id)),
					message: 'Failed to Stop Stack',
					setLoadingState: (value) => (isLoading.stop = value),
					onSuccess: async () => {
						toast.success('Stack Stopped Successfully.');
						await loadStacks();
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.restartStack(id)),
					message: 'Failed to Restart Stack',
					setLoadingState: (value) => (isLoading.restart = value),
					onSuccess: async () => {
						toast.success('Stack Restarted Successfully.');
						await loadStacks();
					}
				});
			} else if (action === 'pull') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.pullStackImages(id)),
					message: 'Failed to pull Stack',
					setLoadingState: (value) => (isLoading.pull = value),
					onSuccess: async () => {
						toast.success('Stack Pulled successfully.');
						await loadStacks();
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
								result: await tryCatch(environmentAPI.destroyStack(id)),
								message: 'Failed to Remove Stack',
								setLoadingState: (value) => (isLoading.destroy = value),
								onSuccess: async () => {
									toast.success('Stack Removed Successfully');
									await loadStacks();
								}
							});
						}
					}
				});
			}
		} catch (error) {
			console.error('Stack action failed:', error);
			toast.error('An error occurred while performing the action');
			isLoading[action as keyof typeof isLoading] = false;
		}
	}

	async function handleCheckForUpdates() {
		isLoading.update = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(autoUpdateAPI.checkStack()),
			message: 'Failed to Check Compose Projects for Updates',
			setLoadingState: (value) => (isLoading.update = value),
			async onSuccess() {
				toast.success('Compose Projects Updated Successfully.');
				await loadStacks();
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Compose Projects</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage Compose Projects</p>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Compose Projects</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isLoadingStacks}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each Array(3) as _}
				<Card.Root>
					<Card.Content class="flex items-center justify-between p-4">
						<div class="space-y-2">
							<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
							<div class="bg-muted h-8 w-12 animate-pulse rounded"></div>
						</div>
						<div class="bg-muted size-10 animate-pulse rounded-full"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Compose Projects List</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						<div class="bg-muted h-9 w-32 animate-pulse rounded"></div>
						<div class="bg-muted h-9 w-28 animate-pulse rounded"></div>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
					<p class="text-lg font-medium">Loading Compose Projects...</p>
					<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch your projects</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<StatCard
				title="Total Compose Projects"
				value={totalStacks}
				icon={FileStack}
				iconColor="text-amber-500"
				class="border-l-4 border-l-amber-500"
			/>
			<StatCard
				title="Running"
				value={runningStacks}
				icon={PlayCircle}
				iconColor="text-green-500"
				class="border-l-4 border-l-green-500"
			/>
			<StatCard
				title="Stopped"
				value={stoppedStacks}
				icon={StopCircle}
				iconColor="text-red-500"
				class="border-l-4 border-l-red-500"
			/>
		</div>

		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Compose Projects List</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						{#if stacks.length > 0}
							<ArcaneButton
								action="inspect"
								label="Update Compose Projects"
								onClick={() => handleCheckForUpdates()}
								loading={isLoading.update}
								loadingLabel="Updating..."
								disabled={isLoading.update}
							/>
							<ArcaneButton
								action="create"
								customLabel="Create Compose Project"
								onClick={() => goto(`/compose/new`)}
							/>
						{/if}
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if stacks.length > 0}
					<UniversalTable
						data={stacks}
						columns={[
							{ accessorKey: 'name', header: 'Name' },
							{ accessorKey: 'service_count', header: 'Services' },
							{ accessorKey: 'status', header: 'Status' },
							{ accessorKey: 'created_at', header: 'Created' },
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
							{@const stateVariant = item.status
								? statusVariantMap[item.status.toLowerCase()]
								: 'gray'}
							<Table.Cell>
								<a class="font-medium hover:underline" href="/compose/{item.id}/">
									{item.name}
								</a>
							</Table.Cell>
							<Table.Cell>{item.serviceCount || 0}</Table.Cell>
							<Table.Cell
								><StatusBadge
									variant={stateVariant}
									text={capitalizeFirstLetter(item.status)}
								/></Table.Cell
							>
							<Table.Cell>{formatFriendlyDate(item.createdAt || '')}</Table.Cell>
							<Table.Cell>
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
											<DropdownMenu.Item
												onclick={() => goto(`/compose/${item.id}`)}
												disabled={isAnyLoading}
											>
												<Pen class="size-4" />
												Edit
											</DropdownMenu.Item>

											{#if item.status !== 'running'}
												<DropdownMenu.Item
													onclick={() => performStackAction('start', item.id)}
													disabled={isLoading.start || isAnyLoading}
												>
													{#if isLoading.start}
														<Loader2 class="size-4 animate-spin" />
													{:else}
														<Play class="size-4" />
													{/if}
													Start
												</DropdownMenu.Item>
											{:else}
												<DropdownMenu.Item
													onclick={() => performStackAction('restart', item.id)}
													disabled={isLoading.restart || isAnyLoading}
												>
													{#if isLoading.restart}
														<Loader2 class="size-4 animate-spin" />
													{:else}
														<RotateCcw class="size-4" />
													{/if}
													Restart
												</DropdownMenu.Item>

												<DropdownMenu.Item
													onclick={() => performStackAction('stop', item.id)}
													disabled={isLoading.stop || isAnyLoading}
												>
													{#if isLoading.stop}
														<Loader2 class="size-4 animate-spin" />
													{:else}
														<StopCircle class="size-4" />
													{/if}
													Stop
												</DropdownMenu.Item>
											{/if}

											<DropdownMenu.Item
												onclick={() => performStackAction('pull', item.id)}
												disabled={isLoading.pull || isAnyLoading}
											>
												{#if isLoading.pull}
													<Loader2 class="size-4 animate-spin" />
												{:else}
													<RotateCcw class="size-4" />
												{/if}
												Pull & Redeploy
											</DropdownMenu.Item>

											<DropdownMenu.Separator />

											<DropdownMenu.Item
												class="focus:text-red-700! text-red-500"
												onclick={() => performStackAction('destroy', item.id)}
												disabled={isLoading.remove || isAnyLoading}
											>
												{#if isLoading.remove}
													<Loader2 class="size-4 animate-spin" />
												{:else}
													<Trash2 class="size-4" />
												{/if}
												Destroy
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						{/snippet}
					</UniversalTable>
				{:else if !error}
					<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
						<FileStack class="text-muted-foreground mb-4 size-12 opacity-40" />
						<p class="text-lg font-medium">No Projects found</p>
						<p class="text-muted-foreground mt-1 max-w-md text-sm">
							Create a new stack using the "Create Project" button above
						</p>
						<div class="mt-4 flex gap-3">
							<ArcaneButton
								action="create"
								customLabel="Create Project"
								onClick={() => goto(`/compose/new`)}
								size="sm"
							/>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
