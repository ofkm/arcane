import type { ColumnDef } from '@tanstack/table-core';
import type { ServiceContainer, ServiceImage } from '$lib/types/docker'
import { formatBytes } from '$lib/utils';
import { capitalizeFirstLetter } from '$lib/utils';
import { statusVariantMap } from '$lib/types/statuses';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import StatusBadge from '$lib/components/badges/status-badge.svelte';

// Column definitions for the dashboard containers table
export const dashboardContainerColumns: ColumnDef<ServiceContainer>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row }) => row.original.name
	},
	{
		accessorKey: 'image',
		header: 'Image',
		cell: ({ row }) => row.original.image
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
		header: 'Status',
		cell: ({ row }) => row.original.status
	}
];

// Column definitions for the dashboard images table
export const dashboardImageColumns: ColumnDef<ServiceImage>[] = [
	{
		accessorKey: 'repo',
		header: 'Name',
		cell: ({ row }) => row.original.repo
	},
	{
		accessorKey: 'tag',
		header: 'Tag',
		cell: ({ row }) => row.original.tag
	},
	{
		accessorKey: 'size',
		header: 'Size',
		cell: ({ row }) => formatBytes(row.original.size)
	}
];
