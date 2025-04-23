import type { Stack } from "$lib/types/stack";
import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import StackActions from "./StackActions.svelte";
import StackNameCell from "./StackNameCell.svelte";
import StackDateCell from "./StackDateCell.svelte";
import CustomBadge from "$lib/components/badges/custom-badge.svelte";
import { capitalizeFirstLetter } from "$lib/utils";
import { statusConfig } from "$lib/types/statuses";

export const columns: ColumnDef<Stack>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      return renderComponent(StackNameCell, {
        id: row.original.id,
        name: row.original.name,
      });
    },
  },
  {
    accessorKey: "serviceCount",
    header: "Services",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status");

      const config = statusConfig[status as keyof typeof statusConfig] || {
        bgColor: "blue-100",
        textColor: "blue-900",
      };

      return renderComponent(CustomBadge, {
        variant: "status",
        rounded: true,
        text: capitalizeFirstLetter(status as string),
        ...config,
      });
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      return renderComponent(StackDateCell, {
        date: row.original.createdAt,
      });
    },
  },
  {
    header: "Source",
    accessorKey: "isExternal",
    cell: ({ row }) => {
      const isExternal = row.getValue("isExternal");
      return renderComponent(CustomBadge, {
        variant: "outline",
        rounded: true,
        bgColor: isExternal ? "amber-100" : "indigo-100",
        textColor: isExternal ? "amber-900" : "indigo-900",
        text: isExternal ? "External" : "Managed",
      });
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return renderComponent(StackActions, {
        id: row.original.id,
        status: row.original.status,
        name: row.original.name,
        isExternal: row.original.isExternal,
      });
    },
    enableSorting: false,
  },
];
