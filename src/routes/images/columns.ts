import type { ServiceImage } from "$lib/services/docker-service";
import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import ImageActions from "./ImageActions.svelte";
import { formatBytes } from "$lib/utils";

export const columns: ColumnDef<ServiceImage>[] = [
  {
    accessorKey: "repo",
    header: "Name",
    cell: ({ row }) => {
      return row.original.repo;
    },
  },
  {
    accessorKey: "tag",
    header: "Tag",
    cell: ({ row }) => {
      return row.original.tag;
    },
  },
  {
    accessorKey: "id",
    header: "Image ID",
    cell: ({ row }) => {
      const shortId =
        row.original.id.split(":")[1]?.substring(0, 12) ||
        row.original.id.substring(0, 12);
      return shortId;
    },
    enableSorting: false,
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => {
      return formatBytes(row.original.size);
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return renderComponent(ImageActions, {
        id: row.original.id,
        repoTag: row.original.repoTags?.[0],
      });
    },
    enableSorting: false,
  },
];
