<script lang="ts">
	import { ScanSearch, Play, RotateCcw, StopCircle, Trash2, Loader2, Plus, Box, RefreshCw, Ellipsis } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import CreateContainerDialog from './create-container-dialog.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { ContainerInfo } from 'dockerode';
	import ContainerAPIService from '$lib/services/api/container-api-service';
	import { tryCatch } from '$lib/utils/try-catch';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { shortId } from '$lib/utils/string.utils';
	import type { PageData } from './$types';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';

	import { containers, containerStats, isLoadingContainers, dockerCacheManager, dockerCacheActions } from '$lib/stores/docker-cache-store';

	const containerApi = new ContainerAPIService();

	let { data }: { data: PageData } = $props();

	let containersData = $derived($containers.data);
	let stats = $derived($containerStats);
	let isRefreshing = $derived($isLoadingContainers);

	let selectedIds = $state([]);
	let isCreateDialogOpen = $state(false);
	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false
	});

	let isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	function getContainerDisplayName(container: ContainerInfo): string {
		if (container.Names && container.Names.length > 0) {
			return container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
		}
		return shortId(container.Id);
	}

	// Initialize cache with server data - Svelte 5 $effect
	$effect(() => {
		if (data.containers) {
			dockerCacheManager.updateContainers(data.containers);
		}
	});

	// Auto-refresh stale data - Svelte 5 $effect with cleanup
	$effect(() => {
		const interval = setInterval(() => {
			if (dockerCacheManager.shouldFetch('containers')) {
				refreshData();
			}
		}, 5000); // Check every 5 seconds

		return () => clearInterval(interval);
	});

	async function refreshData() {
		if ($isLoadingContainers) return;

		dockerCacheManager.setLoading('containers', true);

		try {
			const result = await containerApi.list();
			dockerCacheManager.updateContainers(result);
		} catch (error) {
			dockerCacheManager.setError('containers', 'Failed to refresh containers');
			toast.error('Failed to refresh containers');
		}
	}

	function openCreateDialog() {
		isCreateDialogOpen = true;
	}

	async function handleRemoveContainer(id: string) {
		openConfirmDialog({
			title: 'Delete Container',
			message: 'Are you sure you want to delete this container? This action cannot be undone.',
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					// Optimistic update
					dockerCacheActions.removeContainer(id);

					handleApiResultWithCallbacks({
						result: await tryCatch(containerApi.remove(id)),
						message: 'Failed to Remove Container',
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success('Container Removed Successfully.');
							// No need to invalidateAll - optimistic update already done
						},
						onError: async () => {
							// Revert optimistic update on error
							await refreshData();
						}
					});
				}
			}
		});
	}

	async function performContainerAction(action: 'start' | 'stop' | 'restart', id: string) {
		isLoading[action] = true;

		// Optimistic updates
		if (action === 'start') {
			dockerCacheActions.startContainer(id);
		} else if (action === 'stop') {
			dockerCacheActions.stopContainer(id);
		} else if (action === 'restart') {
			dockerCacheActions.restartContainer(id);
		}

		const apiCall = action === 'start' ? containerApi.start(id) : action === 'stop' ? containerApi.stop(id) : containerApi.restart(id);

		handleApiResultWithCallbacks({
			result: await tryCatch(apiCall),
			message: `Failed to ${capitalizeFirstLetter(action)} Container`,
			setLoadingState: (value) => (isLoading[action] = value),
			async onSuccess() {
				toast.success(`Container ${capitalizeFirstLetter(action)}ed Successfully.`);
				// Schedule a real update to verify state
				setTimeout(refreshData, 1000);
			},
			onError: async () => {
				// Revert optimistic update on error
				await refreshData();
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Containers</h1>
			<p class="text-sm text-muted-foreground mt-1">View and Manage your Containers</p>
		</div>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total</p>
					<p class="text-2xl font-bold">{stats.total}</p>
				</div>
				<div class="bg-primary/10 p-2 rounded-full">
					<Box class="text-primary size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Running</p>
					<p class="text-2xl font-bold">{stats.running}</p>
				</div>
				<div class="bg-green-500/10 p-2 rounded-full">
					<Box class="text-green-500 size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Stopped</p>
					<p class="text-2xl font-bold">{stats.stopped}</p>
				</div>
				<div class="bg-amber-500/10 p-2 rounded-full">
					<Box class="text-amber-500 size-5" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	{#if containersData?.length === 0}
		<div class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card">
			<Box class="text-muted-foreground mb-4 opacity-40 size-12" />
			<p class="text-lg font-medium">No containers found</p>
			<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new container using the "Create Container" button above or use the Docker CLI</p>
			<div class="flex gap-3 mt-4">
				<Button variant="secondary" onclick={refreshData} disabled={isRefreshing}>
					<RefreshCw class="size-4 {isRefreshing ? 'animate-spin' : ''}" />
					Refresh
				</Button>
				<ArcaneButton action="create" label="Create Container" onClick={openCreateDialog} />
			</div>
		</div>
	{:else}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Container List</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
							<RefreshCw class="size-4 {isRefreshing ? 'animate-spin' : ''}" />
							{#if isRefreshing}Refreshing...{:else}Refresh{/if}
						</Button>
						<ArcaneButton action="create" label="Create Container" onClick={openCreateDialog} />
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<UniversalTable
					data={containersData.map((c) => ({ ...c, displayName: getContainerDisplayName(c) }))}
					columns={[
						{ accessorKey: 'displayName', header: 'Name' },
						{ accessorKey: 'Id', header: 'ID' },
						{ accessorKey: 'Image', header: 'Image' },
						{ accessorKey: 'State', header: 'State' },
						{ accessorKey: 'Status', header: 'Status' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					features={{
						selection: false
					}}
					pagination={{
						pageSize: tablePersistence.getPageSize('containers')
					}}
					onPageSizeChange={(newSize) => {
						tablePersistence.setPageSize('containers', newSize);
					}}
					sort={{
						defaultSort: { id: 'displayName', desc: false }
					}}
					display={{
						filterPlaceholder: 'Search containers...',
						noResultsMessage: 'No containers found'
					}}
					bind:selectedIds
				>
					{#snippet rows({ item }: { item: ContainerInfo & { displayName: string } })}
						{@const stateVariant = statusVariantMap[item.State.toLowerCase()]}
						<Table.Cell><a class="font-medium hover:underline" href="/containers/{item.Id}/">{item.displayName}</a></Table.Cell>
						<Table.Cell>{shortId(item.Id)}</Table.Cell>
						<Table.Cell>{item.Image}</Table.Cell>
						<Table.Cell><StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.State)} /></Table.Cell>
						<Table.Cell>{item.Status}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/containers/${item.Id}`)} disabled={isAnyLoading}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>

										{#if item.State !== 'running'}
											<DropdownMenu.Item onclick={() => performContainerAction('start', item.Id)} disabled={isLoading.start || isAnyLoading}>
												{#if isLoading.start}
													<Loader2 class="animate-spin size-4" />
												{:else}
													<Play class="size-4" />
												{/if}
												Start
											</DropdownMenu.Item>
										{:else}
											<DropdownMenu.Item onclick={() => performContainerAction('restart', item.Id)} disabled={isLoading.restart || isAnyLoading}>
												{#if isLoading.restart}
													<Loader2 class="animate-spin size-4" />
												{:else}
													<RotateCcw class="size-4" />
												{/if}
												Restart
											</DropdownMenu.Item>

											<DropdownMenu.Item onclick={() => performContainerAction('stop', item.Id)} disabled={isLoading.stop || isAnyLoading}>
												{#if isLoading.stop}
													<Loader2 class="animate-spin size-4" />
												{:else}
													<StopCircle class="size-4" />
												{/if}
												Stop
											</DropdownMenu.Item>
										{/if}

										<DropdownMenu.Separator />

										<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => handleRemoveContainer(item.Id)} disabled={isLoading.remove || isAnyLoading}>
											{#if isLoading.remove}
												<Loader2 class="animate-spin size-4" />
											{:else}
												<Trash2 class="size-4" />
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

	<CreateContainerDialog
		bind:open={isCreateDialogOpen}
		volumes={data.volumes || []}
		networks={data.networks || []}
		images={(data.images || []).map((img) => ({ ...img, inUse: false }))}
		oncreated={(event) => {
			// Handle new container creation with optimistic update
			if (event.detail.container) {
				dockerCacheActions.createContainer(event.detail.container);
			}
			// Schedule real refresh to get accurate data
			setTimeout(refreshData, 500);
		}}
	/>
</div>
