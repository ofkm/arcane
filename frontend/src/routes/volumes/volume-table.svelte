<script lang="ts">
	import type { VolumeInspectInfo } from 'dockerode';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, HardDrive, Ellipsis, ScanSearch, ChevronDown, Funnel } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';

	type EnhancedVolumeInfo = VolumeInspectInfo & {
		InUse: boolean;
		CreatedAt: string;
		id: string;
	};

	let {
		volumes,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onVolumesChanged
	}: {
		volumes: EnhancedVolumeInfo[];
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<any>;
		onVolumesChanged: () => Promise<void>;
	} = $props();

	let volumeFilters = $state({
		showUsed: true,
		showUnused: true
	});

	let isLoading = $state({
		removing: false
	});

	const volumesWithId = $derived(
		volumes.map((vol) => ({
			...vol,
			id: vol.Name
		}))
	);

	const filteredVolumes = $derived(
		volumesWithId.filter((vol) => {
			const showBecauseUsed = volumeFilters.showUsed && vol.InUse;
			const showBecauseUnused = volumeFilters.showUnused && !vol.InUse;
			return showBecauseUsed || showBecauseUnused;
		})
	);

	const paginatedVolumes: Paginated<EnhancedVolumeInfo> = $derived({
		data: filteredVolumes,
		pagination: {
			totalPages: Math.ceil(filteredVolumes.length / (requestOptions.pagination?.limit || 20)),
			totalItems: filteredVolumes.length,
			currentPage: requestOptions.pagination?.page || 1,
			itemsPerPage: requestOptions.pagination?.limit || 20
		}
	});

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: `Remove ${selectedIds.length} Volume${selectedIds.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to remove the selected volume${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone and will permanently delete all data.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const volumeName of selectedIds) {
						const result = await tryCatch(environmentAPI.deleteVolume(volumeName));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to remove volume ${volumeName}`,
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});

						if (result.error) {
							failureCount++;
						}
					}

					isLoading.removing = false;

					if (successCount > 0) {
						toast.success(
							`Successfully removed ${successCount} volume${successCount > 1 ? 's' : ''}`
						);
						await onVolumesChanged();
					}

					if (failureCount > 0) {
						toast.error(`Failed to remove ${failureCount} volume${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
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
					isLoading.removing = true;
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteVolume(name)),
						message: `Failed to Remove Volume "${name}"`,
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(`Volume "${name}" Removed Successfully.`);
							await onVolumesChanged();
						}
					});
				}
			}
		});
	}
</script>

{#if filteredVolumes.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<Card.Title>Volumes List</Card.Title>
				<div class="flex items-center gap-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="sm">
									<Funnel class="mr-2 size-4" />
									Filter
									<ChevronDown class="ml-2 size-4" />
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
							loading={isLoading.removing}
							disabled={isLoading.removing}
						/>
					{/if}
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={paginatedVolumes}
				bind:requestOptions
				bind:selectedIds
				{onRefresh}
				columns={[
					{ label: 'Name', sortColumn: 'Name' },
					{ label: 'Status', sortColumn: 'InUse' },
					{ label: 'Driver', sortColumn: 'Driver' },
					{ label: 'Created', sortColumn: 'CreatedAt' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search volumes..."
				noResultsMessage="No volumes found"
			>
				{#snippet rows({ item })}
					<Table.Cell>
						<a class="font-medium hover:underline" href="/volumes/{item.Name}/">{item.Name}</a>
					</Table.Cell>
					<Table.Cell>
						{#if item.InUse}
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
			</ArcaneTable>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No volumes found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">
			Create a new volume using the "Create Volume" button above
		</p>
	</div>
{/if}
