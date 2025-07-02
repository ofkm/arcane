<script lang="ts">
	import {
		Trash2,
		HardDrive,
		Ellipsis,
		ScanSearch,
		Loader2,
		ChevronDown,
		ArchiveRestore,
		ArchiveX
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import CreateVolumeSheet from '$lib/components/sheets/create-volume-sheet.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { VolumeCreateOptions, VolumeInspectInfo } from 'dockerode';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import { environmentAPI } from '$lib/services/api';
	import { onMount } from 'svelte';
	import StatCard from '$lib/components/stat-card.svelte';

	let volumes = $state<EnhancedVolumeInfo[]>([]);
	let error = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let isLoadingVolumes = $state(true);

	let volumeFilters = $state({
		showUsed: true,
		showUnused: true
	});

	type EnhancedVolumeInfo = VolumeInspectInfo & {
		inUse: boolean;
		CreatedAt: string;
	};

	const filteredVolumes = $derived(
		volumes.filter(
			(vol) => (volumeFilters.showUsed && vol.inUse) || (volumeFilters.showUnused && !vol.inUse)
		)
	);

	let isDialogOpen = $state({
		create: false,
		remove: false
	});

	let isLoading = $state({
		remove: false,
		creating: false,
		refresh: false
	});

	const totalVolumes = $derived(volumes.length);
	const usedVolumes = $derived(volumes.filter((v) => v.inUse).length);
	const unusedVolumes = $derived(volumes.filter((v) => !v.inUse).length);

	async function loadVolumes() {
		try {
			isLoading.refresh = true;
			const response = await environmentAPI.getVolumes();
			volumes = response || [];
			error = null;
		} catch (err) {
			console.error('Failed to load volumes:', err);
			error = err instanceof Error ? err.message : 'Failed to load volumes';
			volumes = [];
		} finally {
			isLoading.refresh = false;
			isLoadingVolumes = false;
		}
	}

	onMount(() => {
		loadVolumes();
	});

	async function handleCreateVolumeSubmit(options: VolumeCreateOptions) {
		isLoading.creating = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createVolume(options)),
			message: `Failed to Create Volume "${options.Name}"`,
			setLoadingState: (value) => (isLoading.creating = value),
			onSuccess: async () => {
				toast.success(`Volume "${options.Name}" Created Successfully.`);
				await loadVolumes();
				isDialogOpen.create = false;
			}
		});
	}

	async function handleRemoveVolumeConfirm(name: string) {
		openConfirmDialog({
			title: `Remove Volume "${name}"`,
			message: `Are you sure you want to remove the volume "${name}"? This action cannot be undone and will permanently delete all data stored in this volume.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.remove = true;
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteVolume(name)),
						message: `Failed to Remove Volume "${name}"`,
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(`Volume "${name}" Removed Successfully.`);
							await loadVolumes();
						}
					});
				}
			}
		});
	}

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: `Remove ${selectedIds.length} Volume${selectedIds.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to remove the selected volume${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone and will permanently delete all data.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.remove = true;
					let successCount = 0;
					let failureCount = 0;

					for (const volumeName of selectedIds) {
						const result = await tryCatch(environmentAPI.deleteVolume(volumeName));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to remove volume ${volumeName}`,
							setLoadingState: () => {},
							onSuccess: () => {
								toast.success(`Volume "${volumeName}" deleted successfully.`);
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
							await loadVolumes();
						}, 500);
					}
					selectedIds = [];
				}
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Volumes</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage your Docker volumes</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="restart"
				onClick={loadVolumes}
				label="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Error Loading Volumes</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isLoadingVolumes}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each Array(2) as _}
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
						<Card.Title>Volumes List</Card.Title>
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
					<p class="text-lg font-medium">Loading Volumes...</p>
					<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch your volumes</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<StatCard
				title="Total Volumes"
				value={totalVolumes}
				icon={HardDrive}
				iconColor="text-blue-500"
				class="border-l-4 border-l-blue-500"
			/>
			<StatCard
				title="Used Volumes"
				value={usedVolumes}
				icon={ArchiveRestore}
				iconColor="text-green-500"
				class="border-l-4 border-l-green-500"
			/>
			<StatCard
				title="Unused Volumes"
				value={unusedVolumes}
				icon={ArchiveX}
				iconColor="text-red-500"
				class="border-l-4 border-l-red-500"
			/>
		</div>
	{/if}

	{#if filteredVolumes.length > 0}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Volumes List</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" size="sm">
										Filter <ChevronDown class="ml-2 size-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Label>Volume Usage</DropdownMenu.Label>
								<DropdownMenu.CheckboxItem
									checked={volumeFilters.showUsed}
									onCheckedChange={(checked) => {
										volumeFilters.showUsed = checked;
									}}
								>
									Show Used Volumes
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={volumeFilters.showUnused}
									onCheckedChange={(checked) => {
										volumeFilters.showUnused = checked;
									}}
								>
									Show Unused Volumes
								</DropdownMenu.CheckboxItem>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						{#if selectedIds.length > 0}
							<ArcaneButton
								action="remove"
								onClick={handleDeleteSelected}
								loading={isLoading.remove}
								disabled={isLoading.remove}
							/>
						{/if}
						<ArcaneButton
							action="create"
							label="Create Volume"
							onClick={() => (isDialogOpen.create = true)}
							loading={isLoading.creating}
							disabled={isLoading.creating}
						/>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<UniversalTable
					data={filteredVolumes}
					columns={[
						{ accessorKey: 'Name', header: 'Name' },
						{ accessorKey: 'inUse', header: 'Status' },
						{ accessorKey: 'Driver', header: 'Driver' },
						{ accessorKey: 'CreatedAt', header: 'Created' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					pagination={{
						pageSize: tablePersistence.getPageSize('volumes')
					}}
					onPageSizeChange={(newSize) => {
						tablePersistence.setPageSize('volumes', newSize);
					}}
					sort={{
						defaultSort: { id: 'Name', desc: false }
					}}
					bind:selectedIds
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
										<DropdownMenu.Item
											class="focus:text-red-700! text-red-500"
											onclick={() => handleRemoveVolumeConfirm(item.Name)}
										>
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
	{:else if !error}
		<div
			class="bg-card flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center"
		>
			<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
			<p class="text-lg font-medium">No volumes found</p>
			<p class="text-muted-foreground mt-1 max-w-md text-sm">
				Create a new volume using the "Create Volume" button above
			</p>
			<div class="mt-4 flex gap-3">
				<ArcaneButton
					action="create"
					label="Create Volume"
					onClick={() => (isDialogOpen.create = true)}
					size="sm"
				/>
			</div>
		</div>
	{/if}

	<CreateVolumeSheet
		bind:open={isDialogOpen.create}
		isLoading={isLoading.creating}
		onSubmit={handleCreateVolumeSubmit}
	/>
</div>
