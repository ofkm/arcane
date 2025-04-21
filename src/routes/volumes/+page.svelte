<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toast } from "svelte-sonner";
  import {
    Plus,
    AlertCircle,
    HardDrive,
    RefreshCw,
    Filter,
    ArrowUpDown,
    Database,
    Loader2,
  } from "@lucide/svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import { columns } from "./columns";
  import type { PageData } from "./$types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { invalidateAll } from "$app/navigation";
  import CreateVolumeDialog from "./create-volume-dialog.svelte";

  let { data }: { data: PageData } = $props();
  let { error } = data;
  let volumes = $state(data.volumes);

  let isRefreshing = $state(false);
  let isCreateDialogOpen = $state(false);
  let isCreatingVolume = $state(false);

  const totalVolumes = $derived(volumes?.length || 0);

  async function handleCreateVolumeSubmit(event: {
    name: string;
    driver?: string;
    driverOpts?: Record<string, string>;
    labels?: Record<string, string>;
  }) {
    const { name, driver, driverOpts, labels } = event;

    isCreatingVolume = true;
    try {
      const response = await fetch("/api/volumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          driver,
          driverOpts,
          labels,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      toast.success(`Volume "${result.volume.Name}" created successfully.`);
      isCreateDialogOpen = false;

      // Force a refresh with a short timeout to ensure Docker API has time to register the volume
      setTimeout(async () => {
        await refreshData();
      }, 500);
    } catch (err: any) {
      console.error("Failed to create volume:", err);
      toast.error(`Failed to create volume: ${err.message}`);
    } finally {
      isCreatingVolume = false;
    }
  }

  async function refreshData() {
    isRefreshing = true;
    try {
      await invalidateAll();
      volumes = data.volumes;
    } finally {
      setTimeout(() => {
        isRefreshing = false;
      }, 300);
    }
  }

  function openCreateDialog() {
    isCreateDialogOpen = true;
  }
</script>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Volumes</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage persistent data storage for containers
      </p>
    </div>
    <div class="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={refreshData}
        disabled={isRefreshing || isCreatingVolume}
      >
        {#if isRefreshing}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <RefreshCw class="h-4 w-4" />
        {/if}
        Refresh
      </Button>
      <Button variant="outline" size="sm" onclick={openCreateDialog}>
        <Plus class="w-4 h-4" />
        Create Volume
      </Button>
    </div>
  </div>

  {#if error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Error Loading Volumes</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Total Volumes</p>
          <p class="text-2xl font-bold">{totalVolumes}</p>
        </div>
        <div class="bg-amber-500/10 p-2 rounded-full">
          <Database class="h-5 w-5 text-amber-500" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Driver</p>
          <p class="text-2xl font-bold">local</p>
        </div>
        <div class="bg-blue-500/10 p-2 rounded-full">
          <HardDrive class="h-5 w-5 text-blue-500" />
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <Card.Root class="border shadow-sm">
    <Card.Header class="px-6">
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>
            Volume List
            <Badge variant="secondary" class="ml-2">{totalVolumes}</Badge>
          </Card.Title>
          <Card.Description>Manage persistent data storage</Card.Description>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" class="hidden sm:flex">
            <Filter class="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" class="hidden sm:flex">
            <ArrowUpDown class="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      {#if volumes && volumes.length > 0}
        <DataTable data={volumes} {columns} />
      {:else if !error}
        <div
          class="flex flex-col items-center justify-center py-12 px-6 text-center"
        >
          <Database class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <p class="text-lg font-medium">No volumes found</p>
          <p class="text-sm text-muted-foreground mt-1 max-w-md">
            Create a new volume using the "Create Volume" button above or use
            the Docker CLI
          </p>
          <div class="flex gap-3 mt-4">
            <Button variant="outline" size="default" onclick={refreshData}>
              <RefreshCw class="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="default" size="default" onclick={openCreateDialog}>
              <Plus class="h-4 w-4 mr-2" />
              Create Volume
            </Button>
          </div>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <CreateVolumeDialog
    bind:open={isCreateDialogOpen}
    isCreating={isCreatingVolume}
    onSubmit={handleCreateVolumeSubmit}
  />
</div>
