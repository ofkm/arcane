import type { ColumnDef } from "@tanstack/table-core";
import type {
  ServiceContainer,
  ServiceImage,
} from "$lib/services/docker-service";
import { formatBytes } from "$lib/utils";
import StatusBadge from "$lib/components/docker/StatusBadge.svelte";
import { renderComponent } from "$lib/components/ui/data-table/index.js";

// Column definitions for the dashboard containers table
export const dashboardContainerColumns: ColumnDef<ServiceContainer>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "image",
    header: "Image",
    cell: ({ row }) => row.original.image,
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
    cell: ({ row }) => row.original.status,
  },
];

// Column definitions for the dashboard images table
export const dashboardImageColumns: ColumnDef<ServiceImage>[] = [
  {
    accessorKey: "repo",
    header: "Name",
    cell: ({ row }) => row.original.repo,
  },
  {
    accessorKey: "tag",
    header: "Tag",
    cell: ({ row }) => row.original.tag,
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => formatBytes(row.original.size),
  },
];
