import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import NetworkActions from './NetworkActions.svelte';
import SubnetCell from './SubnetCell.svelte';
import type { ServiceNetwork } from '$lib/types/docker';
import NameCell from '$lib/components/badges/name-cell.svelte';

// Use the ServiceNetwork type directly
export type NetworkInfo = ServiceNetwork;

export const columns: ColumnDef<NetworkInfo>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row }) => {
			return renderComponent(NameCell, { name: row.original.name, link: `/networks/${row.original.id}` });
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
		accessorKey: 'subnet',
		header: 'Subnet',
		cell: ({ row }) => {
			return renderComponent(SubnetCell, { subnet: row.original.subnet });
		}
	},
	// Optional: Add Gateway column if needed
	// {
	//   accessorKey: "gateway",
	//   header: "Gateway",
	//   cell: ({ row }) => row.original.gateway ?? 'N/A'
	// },
	// Optional: Add Created column if needed
	// {
	//   accessorKey: "created",
	//   header: "Created",
	//   cell: ({ row }) => new Date(row.original.created).toLocaleString() // Format date
	// },
	{
		id: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(NetworkActions, {
				id: row.original.id, // Pass the actual ID
				name: row.original.name
			});
		},
		enableSorting: false
	}
];
