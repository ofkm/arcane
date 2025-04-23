import type { ServiceContainer } from "$lib/services/docker-service";
import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import DataTableActions from "./ContainerActions.svelte";
import { capitalizeFirstLetter } from "$lib/utils";
import { statusConfig } from "$lib/types/statuses";
import CustomBadge from "$lib/components/badges/custom-badge.svelte";
import IdCell from "./IdCell.svelte";

export const columns: ColumnDef<ServiceContainer>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => {
      return renderComponent(IdCell, { id: row.original.id });
    },
    enableSorting: false,
  },
  {
    accessorKey: "image",
    header: "Image",
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => {
      const config = statusConfig[
        row.getValue("state") as keyof typeof statusConfig
      ] || {
        bgColor: "blue-100",
        textColor: "blue-900",
      };

      return renderComponent(CustomBadge, {
        variant: "status",
        rounded: true,
        text: capitalizeFirstLetter(row.getValue("state") as string),
        ...config,
      });
    },
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return renderComponent(DataTableActions, {
        id: row.original.id,
        state: row.original.state,
      });
    },
    enableSorting: false,
  },
];
