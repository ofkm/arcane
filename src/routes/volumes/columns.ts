import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import VolumeActions from "./VolumeActions.svelte";
import MountpointCell from "./MountpointCell.svelte";
import type { ServiceVolume } from "$lib/services/docker-service";

export type VolumeInfo = ServiceVolume;

export const columns: ColumnDef<VolumeInfo>[] = [
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
    accessorKey: "mountpoint",
    header: "Mountpoint",
    cell: ({ row }) => {
      // Use renderComponent with the new MountpointCell
      return renderComponent(MountpointCell, {
        mountpoint: row.original.mountpoint,
      });
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return renderComponent(VolumeActions, {
        name: row.original.name,
      });
    },
    enableSorting: false,
  },
];
