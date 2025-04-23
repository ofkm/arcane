import type { ColumnDef } from "@tanstack/table-core";
import type {
  ServiceContainer,
  ServiceImage,
} from "$lib/services/docker-service";
import { formatBytes } from "$lib/utils";
import CustomBadge from "$lib/components/badges/custom-badge.svelte";
import { capitalizeFirstLetter } from "$lib/utils";
import { statusConfig } from "$lib/types/statuses";
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
