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
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Table from '$lib/components/ui/table';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiReponse } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import VolumeAPIService from '$lib/services/api/volume-api-service';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';

	let { data }: { data: PageData } = $props();
	let { error } = $state(data);
	let volumes = $state(data.volumes);
	let selectedIds = $state<string[]>([]);

	const volumeApi = new VolumeAPIService();

	let isDialogOpen = $state({
		create: false,
		remove: false
	});

	let isLoading = $state({
		remove: false,
		creating: false
	});

	const totalVolumes = $derived(volumes?.length || 0);

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

		// showRemoveConfirm = false;
		// isDeleting = true;
		// try {
		// 	const endpoint = `/api/volumes/${encodeURIComponent(name)}${force ? '?force=true' : ''}`;
		// 	const response = await fetch(endpoint, {
		// 		method: 'DELETE'
		// 	});

		// 	const result = await response.json();

		// 	if (!response.ok) {
		// 		throw new Error(result.error || `HTTP error! status: ${response.status}`);
		// 	}

		// 	toast.success(`Volume "${name}" deleted successfully.`);
		// 	await invalidateAll();
		// } catch (err: unknown) {
		// 	console.error(`Failed to delete volume "${name}":`, err);
		// 	const message = err instanceof Error ? err.message : String(err);
		// 	toast.error(`Failed to delete volume: ${message}`);
		// } finally {
		// 	isDeleting = false;
		// }
	}

	async function handleCreateVolumeSubmit(event: { name: string; driver?: string; driverOpts?: Record<string, string>; labels?: Record<string, string> }) {
		const { name, driver, driverOpts, labels } = event;

		isLoading.creating = true;
		try {
			const response = await fetch('/api/volumes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name,
					driver,
					driverOpts,
					labels
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || `HTTP error! status: ${response.status}`);
			}

			toast.success(`Volume "${result.volume.Name}" created successfully.`);
			isDialogOpen.create = false;

			await refreshData();
		} catch (err: unknown) {
			console.error('Failed to create volume:', err);
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Failed to create volume: ${message}`);
		} finally {
			isLoading.creating = false;
		}
	}

	async function refreshData() {
		try {
			await invalidateAll();
			volumes = data.volumes;
		} catch (err: unknown) {
			console.error('Failed to refresh volume data:', err);
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Failed to refresh volumes: ${message}`);
		}
	}

	async function handleDeleteSelected() {
		isLoading.remove = true;
		const deletePromises = selectedIds.map(async (name) => {
			try {
				const volume = volumes?.find((v) => v.name === name);
				if (volume?.inUse) {
					toast.error(`Volume "${name}" is in use and cannot be deleted.`);
					return { name, success: false, error: 'Volume in use' };
				}

				const response = await fetch(`/api/volumes/${name}`, {
					method: 'DELETE'
				});
				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.error || `HTTP error! status: ${response.status}`);
				}
				return { name, success: true };
			} catch (err: unknown) {
				console.error(`Failed to delete volume "${name}":`, err);
				const message = err instanceof Error ? err.message : String(err);
				return { name, success: false, error: message };
			}
		});

		const results = await Promise.all(deletePromises);
		const successfulDeletes = results.filter((r) => r.success);
		const failedDeletes = results.filter((r) => !r.success);

		if (successfulDeletes.length > 0) {
			toast.success(`Successfully deleted ${successfulDeletes.length} volume(s).`);
			setTimeout(async () => {
				await refreshData();
				selectedIds = [];
			}, 500);
		}

		failedDeletes.forEach((r) => {
			if (r.error !== 'Volume in use') {
				toast.error(`Failed to delete volume "${r.name}": ${r.error}`);
			}
		});

		isLoading.remove = false;
		isDialogOpen.remove = false;
	}

	function openCreateDialog() {
		isDialogOpen.create = true;
	}

	$effect(() => {
		volumes = data.volumes;
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

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Error Loading Volumes</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
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
					{#if selectedIds.length > 0}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" disabled={isLoading.remove} aria-label={`Group actions for ${selectedIds.length} selected volume(s)`}>
										{#if isLoading.remove}
											<Loader2 class="w-4 h-4 animate-spin" />
											Processing...
										{:else}
											Actions ({selectedIds.length})
											<ChevronDown class="w-4 h-4" />
										{/if}
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item onclick={() => (isDialogOpen.remove = true)} class="text-red-500 focus:!text-red-700" disabled={isLoading.remove}>
									<Trash2 class="w-4 h-4" />
									Delete Selected
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
					<Button variant="secondary" onclick={openCreateDialog}>
						<Plus class="w-4 h-4" />
						Create Volume
					</Button>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if volumes && volumes.length > 0}
				<UniversalTable
					data={volumes}
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
					bind:selectedIds
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
								<DropdownMenu.Content>
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
			{:else if !error}
				<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
					<Database class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
					<p class="text-lg font-medium">No volumes found</p>
					<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new volume using the "Create Volume" button above or use the Docker CLI</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<CreateVolumeDialog bind:open={isDialogOpen.create} isCreating={isLoading.creating} onSubmit={handleCreateVolumeSubmit} />
</div>
