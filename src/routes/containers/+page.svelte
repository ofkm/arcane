<script lang="ts">
	import { ScanSearch, Play, RotateCcw, StopCircle, Trash2, Loader2, Plus, Box, RefreshCw, Ellipsis } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import CreateContainerDialog from './create-container-dialog.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { ServiceContainer } from '$lib/types/docker/container.type';
	import ContainerAPIService from '$lib/services/api/container-api-service';
	import { tryCatch } from '$lib/utils/try-catch';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { handleApiReponse } from '$lib/utils/api.util';
	import { shortId } from '$lib/utils/string.utils';

	const containerApi = new ContainerAPIService();

	let { data } = $props();
	let containers = $state(data.containers);
	let isRefreshing = $state(false);
	let selectedIds = $state([]);
	let isCreateDialogOpen = $state(false);
	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false
	});
	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	const runningContainers = $derived(containers?.filter((c: ServiceContainer) => c.state === 'running').length || 0);
	const stoppedContainers = $derived(containers?.filter((c: ServiceContainer) => c.state === 'exited').length || 0);
	const totalContainers = $derived(containers?.length || 0);

	$effect(() => {
		containers = data.containers;
		if (isRefreshing) {
			isRefreshing = false;
		}
	});

	async function refreshData() {
		isRefreshing = true;
		try {
			await invalidateAll();
			containers = data.containers;
		} finally {
			setTimeout(() => {
				isRefreshing = false;
			}, 300);
		}
	}

	function openCreateDialog() {
		isCreateDialogOpen = true;
	}

	async function handleRemoveContainer(id: string) {
		// const endpoint = `/api/containers/${id}/remove${force ? '?force=true' : ''}`;
		openConfirmDialog({
			title: 'Delete Container',
			message: 'Are you sure you want to delete this container? This action cannot be undone.',
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiReponse(
						await tryCatch(containerApi.remove(id)),
						'Failed to Remove Container',
						(value) => (isLoading.remove = value),
						async () => {
							toast.success('Container Removed Successfully.');
							await invalidateAll();
						}
					);
				}
			}
		});
	}

	async function performContainerAction(action: 'start' | 'stop' | 'restart', id: string) {
		isLoading[action] = true;

		if (action === 'start') {
			handleApiReponse(
				await tryCatch(containerApi.start(id)),
				'Failed to Start Container',
				(value) => (isLoading.start = value),
				async () => {
					toast.success('Container Started Successfully.');
					await invalidateAll();
				}
			);
		} else if (action === 'stop') {
			handleApiReponse(
				await tryCatch(containerApi.stop(id)),
				'Failed to Stop Container',
				(value) => (isLoading.stop = value),
				async () => {
					toast.success('Container Stopped Successfully.');
					await invalidateAll();
				}
			);
		} else if (action === 'restart') {
			handleApiReponse(
				await tryCatch(containerApi.restart(id)),
				'Failed to Restart Container',
				(value) => (isLoading.stop = value),
				async () => {
					toast.success('Container Restarted Successfully.');
					await invalidateAll();
				}
			);
		} else {
			console.error('An Unknown Error Occurred');
			toast.error('An Unknown Error Occurred');
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Containers</h1>
			<p class="text-sm text-muted-foreground mt-1">Manage your Docker containers</p>
		</div>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total</p>
					<p class="text-2xl font-bold">{totalContainers}</p>
				</div>
				<div class="bg-primary/10 p-2 rounded-full">
					<Box class="h-5 w-5 text-primary" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Running</p>
					<p class="text-2xl font-bold">{runningContainers}</p>
				</div>
				<div class="bg-green-500/10 p-2 rounded-full">
					<Box class="h-5 w-5 text-green-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Stopped</p>
					<p class="text-2xl font-bold">{stoppedContainers}</p>
				</div>
				<div class="bg-amber-500/10 p-2 rounded-full">
					<Box class="h-5 w-5 text-amber-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	{#if containers?.length === 0}
		<div class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card">
			<Box class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
			<p class="text-lg font-medium">No containers found</p>
			<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new container using the "Create Container" button above or use the Docker CLI</p>
			<div class="flex gap-3 mt-4">
				<Button variant="secondary" onclick={refreshData}>
					<RefreshCw class="h-4 w-4" />
					Refresh
				</Button>
				<Button variant="secondary" onclick={openCreateDialog}>
					<Plus class="h-4 w-4" />
					Create Container
				</Button>
			</div>
		</div>
	{:else}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Container List</Card.Title>
						<Card.Description>View and manage your Docker containers</Card.Description>
					</div>
					<div class="flex items-center gap-2">
						<Button variant="secondary" onclick={openCreateDialog}>
							<Plus class="w-4 h-4" />
							Create Container
						</Button>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<UniversalTable
					data={containers}
					columns={[
						{ accessorKey: 'name', header: 'Name' },
						{ accessorKey: 'id', header: 'ID' },
						{ accessorKey: 'image', header: 'Image' },
						{ accessorKey: 'state', header: 'State' },
						{ accessorKey: 'status', header: 'Status' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					features={{
						selection: false
					}}
					display={{
						filterPlaceholder: 'Search containers...',
						noResultsMessage: 'No containers found'
					}}
					bind:selectedIds
				>
					{#snippet rows({ item })}
						{@const stateVariant = statusVariantMap[item.state.toLowerCase()]}
						<Table.Cell><a class="font-medium hover:underline" href="/containers/{item.id}/">{item.name}</a></Table.Cell>
						<Table.Cell>{shortId(item.id)}</Table.Cell>
						<Table.Cell>{item.image}</Table.Cell>
						<Table.Cell><StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.state)} /></Table.Cell>
						<Table.Cell>{item.status}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/containers/${item.id}`)} disabled={isAnyLoading}>
											<ScanSearch class="w-4 h-4" />
											Inspect
										</DropdownMenu.Item>

										{#if item.state !== 'running'}
											<DropdownMenu.Item onclick={() => performContainerAction('start', item.id)} disabled={isLoading.start || isAnyLoading}>
												{#if isLoading.start}
													<Loader2 class="w-4 h-4 animate-spin" />
												{:else}
													<Play class="w-4 h-4" />
												{/if}
												Start
											</DropdownMenu.Item>
										{:else}
											<DropdownMenu.Item onclick={() => performContainerAction('restart', item.id)} disabled={isLoading.restart || isAnyLoading}>
												{#if isLoading.restart}
													<Loader2 class="w-4 h-4 animate-spin" />
												{:else}
													<RotateCcw class="w-4 h-4" />
												{/if}
												Restart
											</DropdownMenu.Item>

											<DropdownMenu.Item onclick={() => performContainerAction('stop', item.id)} disabled={isLoading.stop || isAnyLoading}>
												{#if isLoading.stop}
													<Loader2 class="w-4 h-4 animate-spin" />
												{:else}
													<StopCircle class="w-4 h-4" />
												{/if}
												Stop
											</DropdownMenu.Item>
										{/if}

										<DropdownMenu.Separator />

										<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={() => handleRemoveContainer(item.id)} disabled={isLoading.remove || isAnyLoading}>
											{#if isLoading.remove}
												<Loader2 class="w-4 h-4 animate-spin" />
											{:else}
												<Trash2 class="w-4 h-4" />
											{/if}
											Remove
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					{/snippet}
				</UniversalTable>
			</Card.Content>
		</Card.Root>
	{/if}

	<CreateContainerDialog bind:open={isCreateDialogOpen} volumes={data.volumes || []} networks={data.networks || []} images={data.images || []} />
</div>
