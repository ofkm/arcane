import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import NetworkActions from "./NetworkActions.svelte";
import SubnetCell from "./SubnetCell.svelte";
import type { ServiceNetwork } from "$lib/services/docker-service"; // Import the correct type

// Use the ServiceNetwork type directly
export type NetworkInfo = ServiceNetwork;

export const columns: ColumnDef<NetworkInfo>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "driver",
    header: "Driver",
  },
  {
    accessorKey: "scope",
    header: "Scope",
  },
  {
    accessorKey: "subnet",
    header: "Subnet",
    cell: ({ row }) => {
      return renderComponent(SubnetCell, { subnet: row.original.subnet });
    },
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
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return renderComponent(NetworkActions, {
        id: row.original.id, // Pass the actual ID
        name: row.original.name,
      });
    },
    enableSorting: false,
  },
];
