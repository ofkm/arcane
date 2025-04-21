import type { ServiceImage } from "$lib/services/docker-service";
import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import ImageActions from "./ImageActions.svelte";

function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const columns: ColumnDef<ServiceImage>[] = [
  {
    accessorKey: "repo",
    header: "Repository",
    cell: ({ row }) => {
      return row.original.repo;
    },
  },
  {
    accessorKey: "tag",
    header: "Tag",
    cell: ({ row }) => {
      // Return the plain tag string
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
    header: "Actions",
    cell: ({ row }) => {
      return renderComponent(ImageActions, {
        id: row.original.id,
        repoTag: row.original.repoTags?.[0],
      });
    },
    enableSorting: false,
  },
];
