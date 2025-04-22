import type { ServiceContainer } from "$lib/services/docker-service";
import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import DataTableActions from "./ContainerActions.svelte";
import StatusBadge from "$lib/components/docker/StatusBadge.svelte";
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
    header: "State",
    cell: ({ row }) => {
      return renderComponent(StatusBadge, { state: row.original.state });
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
