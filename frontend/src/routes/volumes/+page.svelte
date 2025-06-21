<script lang="ts">
	import { HardDrive, Trash2, Plus, Funnel, ChevronDown, Ellipsis, ScanSearch } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import type { PageData } from './$types';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateVolumeSheet from '$lib/components/sheets/create-volume-sheet.svelte';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { VolumeCreateOptions, VolumeInspectInfo } from 'dockerode';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import { environmentAPI } from '$lib/services/api';

	let { data }: { data: PageData } = $props();

	let volumePageStates = $state({
		volumes: Array.isArray(data.volumes) ? data.volumes : [],
		selectedIds: <string[]>[],
		error: data.error,
		showUsed: true,
		showUnused: true
	});

	const filteredVolumes = $derived(volumePageStates.volumes.filter((vol) => (volumePageStates.showUsed && vol.inUse) || (volumePageStates.showUnused && !vol.inUse)));

	let isDialogOpen = $state({
		create: false,
		remove: false
	});

	let isLoading = $state({
		remove: false,
		creating: false,
		refresh: false
	});

	const totalVolumes = $derived(volumePageStates.volumes.length);

	async function refreshVolumes() {
		isLoading.refresh = true;
		try {
			const refreshedVolumes = await environmentAPI.getVolumes();
			const volumes = Array.isArray(refreshedVolumes) ? refreshedVolumes : [];

			const enhancedVolumes = await Promise.all(
				volumes.map(async (volume) => {
					const inUse = await environmentAPI.getVolumeUsage(volume.Name).catch(() => true);
					return { ...volume, inUse };
				})
			);

			volumePageStates.volumes = enhancedVolumes;
		} catch (error) {
			console.error('Failed to refresh volumes:', error);
			toast.error('Failed to refresh volumes');
		} finally {
			isLoading.refresh = false;
		}
	}

	async function handleRemoveVolumeConfirm(volumeName: string) {
		openConfirmDialog({
			title: 'Delete Volume',
			message: `Are you sure you want to delete volume "${volumeName}"? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteVolume(volumeName)),
						message: `Failed to Remove Volume "${volumeName}"`,
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(`Volume "${volumeName}" Removed Successfully.`);
							await invalidateAll();
						}
					});
				}
			}
		});
	}

	async function handleCreateVolume(volumeCreate: VolumeCreateOptions) {
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createVolume(volumeCreate)),
			message: `Failed to Create Volume "${volumeCreate.Name}"`,
			setLoadingState: (value) => (isLoading.creating = value),
			onSuccess: async () => {
				toast.success(`Volume "${volumeCreate.Name}" created successfully.`);
				await invalidateAll();
				isDialogOpen.create = false;
			}
		});
	}

	async function handleDeleteSelected() {
		openConfirmDialog({
			title: 'Delete Selected Volumes',
			message: `Are you sure you want to delete ${volumePageStates.selectedIds.length} selected volume(s)? This action cannot be undone. Volumes currently used by containers will not be deleted.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.remove = true;

					let successCount = 0;
					let failureCount = 0;

					for (const name of volumePageStates.selectedIds) {
						const volume = volumePageStates.volumes?.find((v) => v.Name === name);

						if (volume?.inUse) {
							toast.error(`Volume "${volume.Name}" is in use and cannot be deleted.`);
							failureCount++;
							continue;
						}

						if (!volume?.Name) continue;
						const result = await tryCatch(environmentAPI.deleteVolume(volume.Name));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to delete volume "${volume.Name}"`,
							setLoadingState: (value) => (isLoading.remove = value),
							onSuccess: async () => {
								toast.success(`Volume "${volume.Name}" deleted successfully.`);
								successCount++;
							}
						});

						if (result.error) {
							failureCount++;
						}
					}
					isLoading.remove = false;

					if (successCount > 0) {
						setTimeout(async () => {
							await invalidateAll();
						}, 500);
					}
					volumePageStates.selectedIds = [];
				}
			}
		});
	}

	$effect(() => {
		volumePageStates.volumes = Array.isArray(data.volumes) ? data.volumes : [];
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Volumes</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage your Docker volumes</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton action="restart" onClick={refreshVolumes} label="Refresh" loading={isLoading.refresh} disabled={isLoading.refresh} />
		</div>
	</div>

	{#if volumePageStates.error}
		<Alert.Root variant="destructive">
			<Alert.Title>Error Loading Volumes</Alert.Title>
			<Alert.Description>{volumePageStates.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Volumes</p>
					<p class="text-2xl font-bold">{totalVolumes}</p>
				</div>
				<div class="rounded-full bg-blue-500/10 p-2">
					<HardDrive class="size-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">In Use</p>
					<p class="text-2xl font-bold">{volumePageStates.volumes.filter((v) => v.inUse).length}</p>
				</div>
				<div class="rounded-full bg-green-500/10 p-2">
					<HardDrive class="size-5 text-green-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	{#if volumePageStates.volumes && volumePageStates.volumes.length > 0}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<Card.Title>Volume List</Card.Title>
					<div class="flex items-center gap-2">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline">
										<Funnel class="size-4" />
										Filter
										<ChevronDown class="size-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Label>Volume Usage</DropdownMenu.Label>
								<DropdownMenu.CheckboxItem
									checked={volumePageStates.showUsed}
									onCheckedChange={(checked) => {
										volumePageStates.showUsed = checked;
									}}
								>
									Show Used Volumes
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={volumePageStates.showUnused}
									onCheckedChange={(checked) => {
										volumePageStates.showUnused = checked;
									}}
								>
									Show Unused Volumes
								</DropdownMenu.CheckboxItem>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						{#if volumePageStates.selectedIds.length > 0}
							<ArcaneButton action="remove" onClick={handleDeleteSelected} loading={isLoading.remove} disabled={isLoading.remove} />
						{/if}
						<ArcaneButton action="create" label="Create Volume" onClick={() => (isDialogOpen.create = true)} loading={isLoading.creating} disabled={isLoading.creating} />
					</div>
				</div>
			</Card.Header>

			<Card.Content>
				<UniversalTable
					data={filteredVolumes}
					columns={[
						{ accessorKey: 'Name', header: 'Name' },
						{ accessorKey: 'inUse', header: 'Status', enableSorting: false },
						{ accessorKey: 'Driver', header: 'Driver' },
						{ accessorKey: 'CreatedAt', header: 'Created' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					idKey="Name"
					display={{
						filterPlaceholder: 'Search volumes...',
						noResultsMessage: 'No volumes found'
					}}
					pagination={{
						pageSize: tablePersistence.getPageSize('volumes')
					}}
					onPageSizeChange={(newSize) => {
						tablePersistence.setPageSize('volumes', newSize);
					}}
					sort={{
						defaultSort: { id: 'Name', desc: false }
					}}
					bind:selectedIds={volumePageStates.selectedIds}
				>
					{#snippet rows({ item })}
						<Table.Cell>
							<a class="font-medium hover:underline" href="/volumes/{item.Name}/">{item.Name}</a>
						</Table.Cell>
						<Table.Cell>
							{#if item.inUse}
								<StatusBadge text="In Use" variant="green" />
							{:else}
								<StatusBadge text="Unused" variant="amber" />
							{/if}
						</Table.Cell>
						<Table.Cell>{item.Driver}</Table.Cell>
						<Table.Cell>{formatFriendlyDate(item.CreatedAt)}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/volumes/${item.Name}`)}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item class="focus:text-red-700! text-red-500" onclick={() => handleRemoveVolumeConfirm(item.Name)}>
											<Trash2 class="size-4" />
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
	{:else if !volumePageStates.error}
		<div class="bg-card flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center">
			<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
			<p class="text-lg font-medium">No volumes found</p>
			<p class="text-muted-foreground mt-1 max-w-md text-sm">Create a new volume using the "Create Volume" button above or use the Docker CLI</p>
			<div class="mt-4 flex gap-3">
				<Button variant="outline" size="sm" onclick={() => (isDialogOpen.create = true)}>
					<Plus class="size-4" />
					Create Volume
				</Button>
			</div>
		</div>
	{/if}

	<CreateVolumeSheet bind:open={isDialogOpen.create} isLoading={isLoading.creating} onSubmit={(volumeCreateData) => handleCreateVolume(volumeCreateData)} />
</div>
