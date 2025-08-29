<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, HardDrive, Ellipsis, ScanSearch } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import { truncateString } from '$lib/utils/string.utils';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import FilterDropdown from '$lib/components/dropdowns/filter-dropdown.svelte';
	import type { VolumeSummaryDto } from '$lib/types/volume.type';

	let {
		volumes = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		volumes: Paginated<VolumeSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
	} = $props();

	let volumeFilters = $state({
		showUsed: true,
		showUnused: true
	});

	let isLoading = $state({
		removing: false
	});

	const filteredVolumes: Paginated<VolumeSummaryDto> = $derived({
		...volumes,
		data: volumes.data.filter((vol) => {
			const showBecauseUsed = volumeFilters.showUsed && vol.inUse;
			const showBecauseUnused = volumeFilters.showUnused && !vol.inUse;
			return showBecauseUsed || showBecauseUnused;
		})
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
						toast.success(`Successfully removed ${successCount} volume${successCount > 1 ? 's' : ''}`);
						volumes = await environmentAPI.getVolumes(requestOptions);
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
			title: `Remove Volume`,
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
							volumes = await environmentAPI.getVolumes(requestOptions);
						}
					});
				}
			}
		});
	}
</script>

{#if volumes.data.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<Card.Title>Volumes List</Card.Title>
				<div class="flex items-center gap-2">
					<FilterDropdown bind:filters={volumeFilters}>
						{#snippet children({ filters })}
							<DropdownMenu.Label>Volume Usage</DropdownMenu.Label>
							<DropdownMenu.CheckboxItem
								checked={filters.showUsed}
								onCheckedChange={(checked) => {
									filters.showUsed = checked;
								}}
							>
								Show Used Volumes
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={filters.showUnused}
								onCheckedChange={(checked) => {
									filters.showUnused = checked;
								}}
							>
								Show Unused Volumes
							</DropdownMenu.CheckboxItem>
						{/snippet}
					</FilterDropdown>
					{#if selectedIds.length > 0}
						<ArcaneButton
							action="remove"
							onclick={handleDeleteSelected}
							loading={isLoading.removing}
							disabled={isLoading.removing}
							customLabel="Remove Selected"
						/>
					{/if}
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if filteredVolumes.data.length > 0}
				<ArcaneTable
					items={filteredVolumes}
					bind:requestOptions
					bind:selectedIds
					onRefresh={async (options) => (volumes = await environmentAPI.getVolumes(options))}
					columns={[
						{ label: 'Name', sortColumn: 'name' },
						{ label: 'Status', sortColumn: 'inUse' },
						{ label: 'Driver', sortColumn: 'driver' },
						{ label: 'Created', sortColumn: 'createdAt' },
						{ label: ' ' }
					]}
					filterPlaceholder="Search volumes..."
					noResultsMessage="No volumes found"
				>
					{#snippet rows({ item })}
						<Table.Cell>
							<a class="font-medium hover:underline" href="/volumes/{item.id}/" title={item.name}>
								{truncateString(item.name, 40)}
							</a>
						</Table.Cell>
						<Table.Cell>
							{#if item.inUse}
								<StatusBadge text="In Use" variant="green" />
							{:else}
								<StatusBadge text="Unused" variant="amber" />
							{/if}
						</Table.Cell>
						<Table.Cell>{item.driver}</Table.Cell>
						<Table.Cell>{formatFriendlyDate(item.createdAt)}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/volumes/${item.id}`)}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item
											variant="destructive"
											onclick={() => handleRemoveVolumeConfirm(item.name)}
											disabled={item.inUse}
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
			{:else}
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
					<p class="text-lg font-medium">No volumes match current filters</p>
					<p class="text-muted-foreground mt-1 max-w-md text-sm">Adjust your filters to see volumes</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No volumes found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">Create a new volume using the "Create Volume" button above</p>
	</div>
{/if}
