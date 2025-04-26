import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import VolumeActions from './VolumeActions.svelte';
import MountpointCell from './MountpointCell.svelte';
import type { ServiceVolume } from '$lib/types/docker';
import UnusedTextBadge from '$lib/components/badges/unused-text-badge.svelte';

// Update the type to include the inUse property
export type VolumeInfo = ServiceVolume & { inUse?: boolean };

export const columns: ColumnDef<VolumeInfo>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row }) => {
			const inUse = row.original.inUse;

			return renderComponent(UnusedTextBadge, {
				name: row.original.name,
				inUse: inUse
			});
		}
	},
	{
		accessorKey: 'driver',
		header: 'Driver'
	},
	{
		accessorKey: 'scope',
		header: 'Scope'
	},
	{
		accessorKey: 'mountpoint',
		header: 'Mountpoint',
		cell: ({ row }) => {
			return renderComponent(MountpointCell, {
				mountpoint: row.original.mountpoint
			});
		}
	},
	{
		id: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(VolumeActions, {
				name: row.original.name,
				inUse: !!row.original.inUse
			});
		},
		enableSorting: false
	}
];
