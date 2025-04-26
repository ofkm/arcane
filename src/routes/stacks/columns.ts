import type { Stack } from '$lib/types/docker/stack.type';
import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import StackActions from './StackActions.svelte';
import StackNameCell from './StackNameCell.svelte';
import StackDateCell from './StackDateCell.svelte';
import StatusBadge from '$lib/components/badges/status-badge.svelte';
import { capitalizeFirstLetter } from '$lib/utils';
import { statusVariantMap } from '$lib/types/statuses';

export const columns: ColumnDef<Stack>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row }) => {
			return renderComponent(StackNameCell, {
				id: row.original.id,
				name: row.original.name
			});
		}
	},
	{
		accessorKey: 'serviceCount',
		header: 'Services'
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			const status = row.getValue('status') as string;
			const variant = statusVariantMap[status.toLowerCase()] || 'gray';

			return renderComponent(StatusBadge, {
				variant: variant,
				text: capitalizeFirstLetter(status)
			});
		}
	},
	{
		accessorKey: 'createdAt',
		header: 'Created',
		cell: ({ row }) => {
			return renderComponent(StackDateCell, {
				date: row.original.createdAt
			});
		}
	},
	{
		header: 'Source',
		accessorKey: 'isExternal',
		cell: ({ row }) => {
			const isExternal = row.getValue('isExternal');
			return renderComponent(StatusBadge, {
				variant: isExternal ? 'amber' : 'green',
				text: isExternal ? 'External' : 'Managed'
			});
		}
	},
	{
		id: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(StackActions, {
				id: row.original.id,
				status: row.original.status,
				name: row.original.name,
				isExternal: row.original.isExternal
			});
		},
		enableSorting: false
	}
];
