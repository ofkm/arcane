<script lang="ts">
  import type { PageData } from "./$types";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Plus,
    AlertCircle,
    Layers,
    RefreshCw,
    Filter,
    ArrowUpDown,
    Upload,
    FileStack,
  } from "@lucide/svelte";
  import UniversalTable from "$lib/components/universal-table.svelte";
  import { columns } from "./columns";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { invalidateAll } from "$app/navigation";

  let { data }: { data: PageData } = $props();
  const { stacks, error } = data;
  let selectedIds = $state([]);

  let isRefreshing = $state(false);

  // Calculate stack stats
  const totalStacks = $derived(stacks?.length || 0);
  const runningStacks = $derived(
    stacks?.filter((s) => s.status === "running").length || 0
  );
  const partialStacks = $derived(
    stacks?.filter((s) => s.status === "partially running").length || 0
  );

  function createStack() {
    window.location.href = "/stacks/new";
  }

  async function importStack() {
    // TODO: Implement import stack modal functionality
    alert("Implement import stack functionality");
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
      <h1 class="text-3xl font-bold tracking-tight">Stacks</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage Docker Compose stacks
      </p>
    </div>
    <div class="flex gap-2">
      <!-- put buttons here -->
    </div>
  </div>

  {#if error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Error Loading Stacks</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Stack stats summary -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Total Stacks</p>
          <p class="text-2xl font-bold">{totalStacks}</p>
        </div>
        <div class="bg-primary/10 p-2 rounded-full">
          <FileStack class="h-5 w-5 text-primary" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Running</p>
          <p class="text-2xl font-bold">{runningStacks}</p>
        </div>
        <div class="bg-green-500/10 p-2 rounded-full">
          <Layers class="h-5 w-5 text-green-500" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">
            Partially Running
          </p>
          <p class="text-2xl font-bold">{partialStacks}</p>
        </div>
        <div class="bg-amber-500/10 p-2 rounded-full">
          <Layers class="h-5 w-5 text-amber-500" />
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main stacks table -->
  <Card.Root class="border shadow-sm">
    <Card.Header class="px-6">
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Stack List</Card.Title>
          <Card.Description>Manage Docker Compose stacks</Card.Description>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onclick={importStack}>
            <Upload class="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onclick={createStack}>
            <Plus class="w-4 h-4" />
            Create Stack
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      {#if stacks && stacks.length > 0}
        <UniversalTable
          data={stacks}
          {columns}
          display={{
            filterPlaceholder: "Search stacks...",
            noResultsMessage: "No stacks found",
          }}
          bind:selectedIds
        />
      {:else if !error}
        <div
          class="flex flex-col items-center justify-center py-12 px-6 text-center"
        >
          <FileStack class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <p class="text-lg font-medium">No stacks found</p>
          <p class="text-sm text-muted-foreground mt-1 max-w-md">
            Create a new stack using the "Create Stack" button above or import
            an existing compose file
          </p>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
