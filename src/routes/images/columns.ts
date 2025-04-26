import type { ServiceImage } from '$lib/types/docker';
import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import ImageActions from './ImageActions.svelte';
import { formatBytes } from '$lib/utils';
import UnusedTextBadge from '$lib/components/badges/unused-text-badge.svelte';

// Enhanced type with usage info
export type EnhancedImage = ServiceImage & { inUse?: boolean };

export const columns: ColumnDef<EnhancedImage>[] = [
	{
		accessorKey: 'repo',
		header: 'Name',
		cell: ({ row }) => {
			const inUse = row.original.inUse;

			return renderComponent(UnusedTextBadge, {
				name: row.original.repo,
				inUse: row.original.inUse
			});
		}
	},
	{
		accessorKey: 'tag',
		header: 'Tag',
		cell: ({ row }) => {
			return row.original.tag;
		}
	},
	{
		accessorKey: 'id',
		header: 'Image ID',
		cell: ({ row }) => {
			const shortId = row.original.id.split(':')[1]?.substring(0, 12) || row.original.id.substring(0, 12);
			return shortId;
		},
		enableSorting: false
	},
	{
		accessorKey: 'size',
		header: 'Size',
		cell: ({ row }) => {
			return formatBytes(row.original.size);
		}
	},
	{
		id: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(ImageActions, {
				id: row.original.id,
				repoTag: row.original.repoTags?.[0],
				inUse: !!row.original.inUse
			});
		},
		enableSorting: false
	}
];
