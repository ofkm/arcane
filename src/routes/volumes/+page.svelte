<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { Plus, AlertCircle, HardDrive, Database, Trash2, Loader2, ChevronDown, Ellipsis, ScanSearch } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import CreateVolumeDialog from './create-volume-dialog.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Table from '$lib/components/ui/table';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiReponse } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import VolumeAPIService from '$lib/services/api/volume-api-service';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { VolumeCreateOptions } from 'dockerode';

	let { data }: { data: PageData } = $props();

	let volumePageStates = $state({
		volumes: data.volumes,
		selectedIds: <string[]>[],
		error: data.error
	});

	let isDialogOpen = $state({
		create: false,
		remove: false
	});

	let isLoading = $state({
		remove: false,
		creating: false
	});

	const totalVolumes = $derived(volumePageStates.volumes.length);

	const volumeApi = new VolumeAPIService();

	async function handleRemoveVolumeConfirm(volumeName: string) {
		openConfirmDialog({
			title: 'Delete Volume',
			message: 'Are you sure you want to delete this volume? This action cannot be undone.',
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiReponse(
						await tryCatch(volumeApi.remove(volumeName)),
						'Failed to Remove Volume',
						(value) => (isLoading.remove = value),
						async () => {
							toast.success('Volume Removed Successfully.');
							await invalidateAll();
						}
					);
				}
			}
		});
	}

	async function handleCreateVolume(volumeCreate: VolumeCreateOptions) {
		handleApiReponse(
			await tryCatch(volumeApi.create(volumeCreate)),
			`Failed to Create Volume "${volumeCreate.Name}"`,
			(value) => (isLoading.creating = value),
			async () => {
				toast.success(`Volume "${volumeCreate.Name}" Create successfully.`);
				await invalidateAll();
			}
		);
	}

	// async function handleCreateVolumeSubmit(event: { name: string; driver?: string; driverOpts?: Record<string, string>; labels?: Record<string, string> }) {
	// 	const { name, driver, driverOpts, labels } = event;

	// 	isLoading.creating = true;
	// 	try {
	// 		const response = await fetch('/api/volumes', {
	// 			method: 'POST',
	// 			headers: {
	// 				'Content-Type': 'application/json'
	// 			},
	// 			body: JSON.stringify({
	// 				name,
	// 				driver,
	// 				driverOpts,
	// 				labels
	// 			})
	// 		});

	// 		const result = await response.json();

	// 		if (!response.ok) {
	// 			throw new Error(result.error || `HTTP error! status: ${response.status}`);
	// 		}

	// 		toast.success(`Volume "${result.volume.Name}" created successfully.`);
	// 		isDialogOpen.create = false;

	// 		await refreshData();
	// 	} catch (err: unknown) {
	// 		console.error('Failed to create volume:', err);
	// 		const message = err instanceof Error ? err.message : String(err);
	// 		toast.error(`Failed to create volume: ${message}`);
	// 	} finally {
	// 		isLoading.creating = false;
	// 	}
	// }

	async function handleDeleteSelected() {
		openConfirmDialog({
			title: 'Delete Selected Volumes',
			message: `Are you sure you want to delete ${volumePageStates.selectedIds.length} selected images? This action cannot be undone. Images currently used by containers will not be deleted.
`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.remove = true;

					let successCount = 0;
					let failureCount = 0;

					for (const name of volumePageStates.selectedIds) {
						const volume = volumePageStates.volumes?.find((v) => v.name === name);

						if (volume?.inUse) {
							toast.error(`Volume "${volume.name}" is in use and cannot be deleted.`);
							failureCount++;
							continue;
						}

						if (!volume?.name) continue;
						const result = await tryCatch(volumeApi.remove(volume.name));
						handleApiReponse(
							result,
							`Failed to delete image "${volume.name}"`,
							(value) => (isLoading.remove = value),
							async () => {
								toast.success(`Volume "${volume.name}" deleted successfully.`);
								successCount++;
							}
						);

						if (result.error) {
							failureCount++;
						}
					}

					console.log(`Finished deleting. Success: ${successCount}, Failed: ${failureCount}`);
					if (successCount > 0) {
						setTimeout(async () => {
							await invalidateAll();
							volumePageStates.selectedIds = [];
						}, 500);
					} else {
						volumePageStates.selectedIds = [];
					}
				}
			}
		});
	}

	$effect(() => {
		volumePageStates.volumes = data.volumes;
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Volumes</h1>
			<p class="text-sm text-muted-foreground mt-1">Manage persistent data storage for containers</p>
		</div>
		<div class="flex gap-2"></div>
	</div>

	{#if volumePageStates.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Error Loading Volumes</Alert.Title>
			<Alert.Description>{volumePageStates.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Volumes</p>
					<p class="text-2xl font-bold">{totalVolumes}</p>
				</div>
				<div class="bg-amber-500/10 p-2 rounded-full">
					<Database class="h-5 w-5 text-amber-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Driver</p>
					<p class="text-2xl font-bold">local</p>
				</div>
				<div class="bg-blue-500/10 p-2 rounded-full">
					<HardDrive class="h-5 w-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Volume List</Card.Title>
					<Card.Description>Manage persistent data storage</Card.Description>
				</div>
				<div class="flex items-center gap-2">
					{#if volumePageStates.selectedIds.length > 0}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" disabled={isLoading.remove} aria-label={`Group actions for ${volumePageStates.selectedIds.length} selected volume(s)`}>
										{#if isLoading.remove}
											<Loader2 class="w-4 h-4 animate-spin" />
											Processing...
										{:else}
											Actions ({volumePageStates.selectedIds.length})
											<ChevronDown class="w-4 h-4" />
										{/if}
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Item onclick={() => handleDeleteSelected()} class="text-red-500 focus:!text-red-700" disabled={isLoading.remove}>
									<Trash2 class="w-4 h-4" />
									Delete Selected
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
					<Button variant="secondary" onclick={() => (isDialogOpen.create = true)}>
						<Plus class="w-4 h-4" />
						Create Volume
					</Button>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if volumePageStates.volumes && volumePageStates.volumes.length > 0}
				<UniversalTable
					data={volumePageStates.volumes}
					idKey="name"
					columns={[
						{ accessorKey: 'name', header: 'Name' },
						{ accessorKey: 'mountpoint', header: 'Mountpoint' },
						{ accessorKey: 'driver', header: 'Driver' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					display={{
						filterPlaceholder: 'Search volumes...',
						noResultsMessage: 'No volumes found'
					}}
					bind:selectedIds={volumePageStates.selectedIds}
				>
					{#snippet rows({ item })}
						<Table.Cell>
							<div class="flex items-center gap-2">
								<span class="truncate">
									<a class="font-medium hover:underline" href="/volumes/{item.name}/">{item.name}</a>
								</span>
								{#if !item.inUse}
									<StatusBadge text="Unused" variant="amber" />
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell>{item.mountpoint}</Table.Cell>
						<Table.Cell>{item.driver}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/volumes/${encodeURIComponent(item.name)}`)} disabled={isLoading.remove}>
											<ScanSearch class="w-4 h-4" />
											Inspect
										</DropdownMenu.Item>

										<DropdownMenu.Separator />

										<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={() => handleRemoveVolumeConfirm(item.name)} disabled={isLoading.remove}>
											{#if isLoading.remove}
												<Loader2 class="w-4 h-4 animate-spin" />
											{:else}
												<Trash2 class="w-4 h-4" />
											{/if}
											Delete
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					{/snippet}
				</UniversalTable>
			{:else if !volumePageStates.error}
				<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
					<Database class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
					<p class="text-lg font-medium">No volumes found</p>
					<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new volume using the "Create Volume" button above or use the Docker CLI</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<CreateVolumeDialog bind:open={isDialogOpen.create} isCreating={isLoading.creating} onSubmit={(volumeCreateData) => handleCreateVolume(volumeCreateData)} />
</div>
