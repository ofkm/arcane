<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertCircle, Layers, FileStack, Loader2, Play, RotateCcw, StopCircle, Trash2, Ellipsis, Pen } from '@lucide/svelte';
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

	let { data }: { data: PageData } = $props();
	let stacks = $derived(data.stacks);
	let selectedIds = $state<string[]>([]);
	let isLoading = $state({
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

	const totalStacks = $derived(stacks?.length || 0);
	const runningStacks = $derived(stacks?.filter((s) => s.status === 'running').length || 0);
	const partialStacks = $derived(stacks?.filter((s) => s.status === 'partially running').length || 0);

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
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Stacks</h1>
			<p class="text-sm text-muted-foreground mt-1">View and Manage Compose Stacks</p>
		</div>
	</div>

	{#if data.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Stacks</Alert.Title>
			<Alert.Description>{data.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Stacks</p>
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
					<Card.Title>Stack List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					<ArcaneButton action="create" customLabel="Create Stack" onClick={() => goto(`/stacks/new`)} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if stacks && stacks.length > 0}
				<UniversalTable
					data={stacks}
					columns={[
						{ accessorKey: 'Name', header: 'Name' },
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
					display={{
						filterPlaceholder: 'Search stacks...',
						noResultsMessage: 'No stacks found'
					}}
					bind:selectedIds
				>
					{#snippet rows({ item })}
						{@const stateVariant = statusVariantMap[item.status.toLowerCase()]}
						<Table.Cell>
							{#if item.isExternal}
								{item.name}
							{:else}
								<div class="flex items-center gap-2">
									<a class="font-medium hover:underline" href="/stacks/{item.id}/">
										{item.name}
									</a>
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
						<Table.Cell><StatusBadge variant={item.isExternal ? 'amber' : 'green'} text={item.isExternal ? 'External' : 'Managed'} /></Table.Cell>
						<Table.Cell>{item.createdAt}</Table.Cell>
						<Table.Cell>
							{#if item.isExternal}
								<ArcaneButton action="pull" customLabel="Import" onClick={() => handleImportStack(item.id, item.name)} loading={isLoading.import} disabled={isLoading.import} />
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
											<DropdownMenu.Item onclick={() => goto(`/stacks/${item.id}`)} disabled={isAnyLoading}>
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
						<ArcaneButton action="create" customLabel="Create Stack" onClick={() => goto(`/stacks/new`)} size="sm" />
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
