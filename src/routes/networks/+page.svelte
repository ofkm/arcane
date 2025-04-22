<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Plus,
    AlertCircle,
    Network,
    RefreshCw,
    Filter,
    ArrowUpDown,
  } from "@lucide/svelte";
  import UniversalTable from "$lib/components/universal-table.svelte";
  import { columns } from "./columns";
  import type { PageData } from "./$types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { invalidateAll } from "$app/navigation";

  let { data }: { data: PageData } = $props();
  const { networks, error } = data;
  let selectedIds = $state([]);

  let isRefreshing = $state(false);

  // Calculate network stats
  const totalNetworks = $derived(networks?.length || 0);
  const bridgeNetworks = $derived(
    networks?.filter((n) => n.driver === "bridge").length || 0
  );
  const overlayNetworks = $derived(
    networks?.filter((n) => n.driver === "overlay").length || 0
  );

  function createNetwork() {
    alert("Implement create network functionality");
  }

  async function refreshData() {
    isRefreshing = true;
    await invalidateAll();
    setTimeout(() => {
      isRefreshing = false;
    }, 500);
  }
</script>

<div class="space-y-6">
  <!-- Header with refresh and create buttons -->
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Networks</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage Docker container networking
      </p>
    </div>
    <div class="flex gap-2">
      <!-- Put buttons here -->
    </div>
  </div>

  {#if error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Error Loading Networks</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Network stats summary -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">
            Total Networks
          </p>
          <p class="text-2xl font-bold">{totalNetworks}</p>
        </div>
        <div class="bg-primary/10 p-2 rounded-full">
          <Network class="h-5 w-5 text-primary" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">
            Bridge Networks
          </p>
          <p class="text-2xl font-bold">{bridgeNetworks}</p>
        </div>
        <div class="bg-blue-500/10 p-2 rounded-full">
          <Network class="h-5 w-5 text-blue-500" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">
            Overlay Networks
          </p>
          <p class="text-2xl font-bold">{overlayNetworks}</p>
        </div>
        <div class="bg-purple-500/10 p-2 rounded-full">
          <Network class="h-5 w-5 text-purple-500" />
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main networks table -->
  <Card.Root class="border shadow-sm">
    <Card.Header class="px-6">
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Network List</Card.Title>
          <Card.Description>Manage container communication</Card.Description>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onclick={createNetwork}>
            <Plus class="w-4 h-4" />
            Create Network
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      {#if networks && networks.length > 0}
        <UniversalTable
          data={networks}
          {columns}
          display={{
            filterPlaceholder: "Search networks...",
            noResultsMessage: "No networks found",
          }}
          bind:selectedIds
        />
      {:else if !error}
        <div
          class="flex flex-col items-center justify-center py-12 px-6 text-center"
        >
          <Network class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <p class="text-lg font-medium">No networks found</p>
          <p class="text-sm text-muted-foreground mt-1 max-w-md">
            Create a new network using the "Create Network" button above or use
            the Docker CLI
          </p>
          <div class="flex gap-3 mt-4">
            <Button variant="outline" size="sm" onclick={refreshData}>
              <RefreshCw class="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onclick={createNetwork}>
              <Plus class="h-4 w-4" />
              Create Network
            </Button>
          </div>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
