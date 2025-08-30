<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { format } from 'date-fns';
	import { truncateString } from '$lib/utils/string.utils';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { VolumeSummaryDto } from '$lib/types/volume.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';

	let {
		volumes = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		volumes: Paginated<VolumeSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
	} = $props();

	let isLoading = $state({
		removing: false
	});

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

	async function handleDeleteSelected(ids: string[]) {
		if (!ids?.length) return;
		isLoading.removing = true;
		let successCount = 0;
		let failureCount = 0;

		const idToName = new Map(volumes.data.map((v) => [v.id, v.name] as const));

		for (const id of ids) {
			const name = idToName.get(id);
			if (!name) continue;
			const result = await tryCatch(environmentAPI.deleteVolume(name));
			handleApiResultWithCallbacks({
				result,
				message: `Failed to remove volume ${name}`,
				setLoadingState: () => {},
				onSuccess: () => (successCount += 1)
			});
			if (result.error) failureCount += 1;
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

	const columns = [
		{ accessorKey: 'id', title: 'ID', hidden: true },
		{ accessorKey: 'name', title: 'Name', sortable: true, cell: NameCell },
		{
			accessorKey: 'inUse',
			title: 'Status',
			sortable: true,
			cell: StatusCell
		},
		{ accessorKey: 'driver', title: 'Driver', sortable: true },
		{ accessorKey: 'createdAt', title: 'Created', sortable: true, cell: CreatedCell }
	] satisfies ColumnSpec<VolumeSummaryDto>[];
</script>

{#snippet NameCell({ item }: { item: VolumeSummaryDto })}
	<a class="font-medium hover:underline" href="/volumes/{item.id}/" title={item.name}>
		{truncateString(item.name, 40)}
	</a>
{/snippet}

{#snippet StatusCell({ item }: { item: VolumeSummaryDto })}
	{#if item.inUse}
		<StatusBadge text="In Use" variant="green" />
	{:else}
		<StatusBadge text="Unused" variant="amber" />
	{/if}
{/snippet}

{#snippet CreatedCell({ value }: { value: unknown })}
	{format(new Date(String(value)), 'PP p')}
{/snippet}

{#snippet RowActions({ item }: { item: VolumeSummaryDto })}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">Open menu</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => goto(`/volumes/${item.id}`)}>
					<ScanSearchIcon class="size-4" />
					Inspect
				</DropdownMenu.Item>
				<DropdownMenu.Item variant="destructive" onclick={() => handleRemoveVolumeConfirm(item.name)} disabled={item.inUse}>
					<Trash2Icon class="size-4" />
					Remove
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root>
	<Card.Content class="py-5">
		<ArcaneTable
			items={volumes}
			bind:requestOptions
			bind:selectedIds
			onRemoveSelected={(ids) => handleDeleteSelected(ids)}
			onRefresh={async (options) => (volumes = await environmentAPI.getVolumes(options))}
			{columns}
			rowActions={RowActions}
		/>
	</Card.Content>
</Card.Root>
