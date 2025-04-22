<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { columns } from "./columns";
  import { Plus, Box, RefreshCw } from "@lucide/svelte";
  import UniversalTable from "$lib/components/universal-table.svelte";
  import { invalidateAll } from "$app/navigation";

  let { data } = $props();
  const { containers } = data;

  let isRefreshing = $state(false);
  let selectedIds = $state([]);

  // Calculate running containers
  const runningContainers = $derived(
    containers?.filter((c) => c.state === "running").length || 0
  );

  // Calculate stopped containers
  const stoppedContainers = $derived(
    containers?.filter((c) => c.state === "exited").length || 0
  );

  // Calculate total containers
  const totalContainers = $derived(containers?.length || 0);

  async function refreshData() {
    isRefreshing = true;
    await invalidateAll();
    setTimeout(() => {
      isRefreshing = false;
    }, 500);
  }
</script>

<div class="space-y-6">
  <!-- Header with refresh button -->
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Containers</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage your Docker containers
      </p>
    </div>
    <div class="flex gap-2">
      <!-- put buttons here -->
    </div>
  </div>

  <!-- Container stats summary -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Total</p>
          <p class="text-2xl font-bold">{totalContainers}</p>
        </div>
        <div class="bg-primary/10 p-2 rounded-full">
          <Box class="h-5 w-5 text-primary" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Running</p>
          <p class="text-2xl font-bold">{runningContainers}</p>
        </div>
        <div class="bg-green-500/10 p-2 rounded-full">
          <Box class="h-5 w-5 text-green-500" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Stopped</p>
          <p class="text-2xl font-bold">{stoppedContainers}</p>
        </div>
        <div class="bg-amber-500/10 p-2 rounded-full">
          <Box class="h-5 w-5 text-amber-500" />
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main container table -->
  <Card.Root class="border shadow-sm">
    <Card.Header class="px-6">
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Container List</Card.Title>
          <Card.Description
            >View and manage your Docker containers</Card.Description
          >
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus class="w-4 h-4" />
            Create Container
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <UniversalTable
        data={containers}
        {columns}
        display={{
          filterPlaceholder: "Search containers...",
          noResultsMessage: "No containers found",
        }}
        bind:selectedIds
      />
    </Card.Content>
  </Card.Root>

  {#if containers?.length === 0}
    <div
      class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card"
    >
      <Box class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
      <p class="text-lg font-medium">No containers found</p>
      <p class="text-sm text-muted-foreground mt-1 max-w-md">
        Create a new container using the "Create Container" button above or use
        the Docker CLI
      </p>
      <Button variant="outline" size="sm" onclick={refreshData}>
        <RefreshCw class="h-4 w-4" />
        Refresh
      </Button>
    </div>
  {/if}
</div>
