import type { ServiceContainer } from '$lib/types/docker';
import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableActions from './ContainerActions.svelte';
import { capitalizeFirstLetter } from '$lib/utils';
import IdCell from './components/IdCell.svelte';
import CellName from './components/NameCell.svelte';
import StatusBadge from '$lib/components/badges/status-badge.svelte';
import { statusVariantMap } from '$lib/types/statuses';

export const columns: ColumnDef<ServiceContainer>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row }) => {
			return renderComponent(CellName, {
				id: row.original.id,
				name: row.original.name
			});
		}
	},
	{
		accessorKey: 'id',
		header: 'ID',
		cell: ({ row }) => {
			return renderComponent(IdCell, { id: row.original.id });
		},
		enableSorting: false
	},
	{
		accessorKey: 'image',
		header: 'Image'
	},
	{
		accessorKey: 'state',
		header: 'Status',
		cell: ({ row }) => {
			const variant = statusVariantMap[row.original.state.toLowerCase()] || 'gray';

			return renderComponent(StatusBadge, {
				variant: variant,
				text: capitalizeFirstLetter(row.original.state)
			});
		}
	},
	{
		accessorKey: 'status',
		header: 'Status'
	},
	{
		id: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(DataTableActions, {
				id: row.original.id,
				state: row.original.state
			});
		},
		enableSorting: false
	}
];
