<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Plus,
    AlertCircle,
    Network,
    RefreshCw,
    Trash2,
    Loader2,
    ChevronDown,
  } from "@lucide/svelte";
  import UniversalTable from "$lib/components/universal-table.svelte";
  import { columns } from "./columns";
  import type { PageData } from "./$types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { cn } from "$lib/utils";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import CreateNetworkDialog from "./CreateNetworkDialog.svelte";
  import type { NetworkCreateOptions } from "dockerode";

  let { data }: { data: PageData } = $props();
  let networks = $state(data.networks || []);
  let error = $state(data.error);
  let selectedIds = $state<string[]>([]);

  let isRefreshing = $state(false);
  let isDeletingSelected = $state(false);
  let isConfirmDeleteDialogOpen = $state(false);
  let isCreateDialogOpen = $state(false);
  let isCreatingNetwork = $state(false);

  $effect(() => {
    networks = data.networks || [];
    error = data.error;
  });

  const totalNetworks = $derived(networks?.length || 0);
  const bridgeNetworks = $derived(
    networks?.filter((n) => n.driver === "bridge").length || 0
  );
  const overlayNetworks = $derived(
    networks?.filter((n) => n.driver === "overlay").length || 0
  );

  function openCreateDialog() {
    isCreateDialogOpen = true;
  }

  async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
    isCreatingNetwork = true;
    try {
      const response = await fetch("/api/networks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      toast.success(
        result.message || `Network "${result.network.name}" created.`
      );
      isCreateDialogOpen = false;
      setTimeout(async () => {
        await refreshData();
      }, 300);
    } catch (err: any) {
      console.error("Failed to create network:", err);
      toast.error(`Failed to create network: ${err.message}`);
    } finally {
      isCreatingNetwork = false;
    }
  }

  async function refreshData() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      await invalidateAll();
    } catch (err) {
      console.error("Error refreshing networks:", err);
      toast.error("Failed to refresh network list.");
    } finally {
      setTimeout(() => {
        isRefreshing = false;
      }, 300);
    }
  }

  async function handleDeleteSelected() {
    isDeletingSelected = true;
    const deletePromises = selectedIds.map(async (id) => {
      try {
        const networkName =
          networks.find((n) => n.id === id)?.name || id.substring(0, 12);

        const response = await fetch(
          `/api/networks/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }
        return { id, success: true, name: networkName };
      } catch (err: any) {
        console.error(`Failed to delete network "${id}":`, err);
        const networkName =
          networks.find((n) => n.id === id)?.name || id.substring(0, 12);
        return { id, success: false, error: err.message, name: networkName };
      }
    });

    const results = await Promise.all(deletePromises);
    const successfulDeletes = results.filter((r) => r.success);
    const failedDeletes = results.filter((r) => !r.success);

    if (successfulDeletes.length > 0) {
      toast.success(
        `Successfully deleted ${successfulDeletes.length} network(s).`
      );
      setTimeout(async () => {
        await refreshData();
        selectedIds = [];
      }, 500);
    }

    failedDeletes.forEach((r) => {
      toast.error(`Failed to delete network "${r.name}": ${r.error}`);
    });

    isDeletingSelected = false;
    isConfirmDeleteDialogOpen = false;
  }
</script>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Networks</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage Docker container networking
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="secondary"
        size="icon"
        onclick={refreshData}
        disabled={isRefreshing}
      >
        <RefreshCw class={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        <span class="sr-only">Refresh</span>
      </Button>
      <Button
        variant="secondary"
        onclick={openCreateDialog}
        disabled={isCreatingNetwork}
      >
        <Plus class="w-4 h-4" />
        Create Network
      </Button>
    </div>
  </div>

  {#if error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Error Loading Networks</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

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

  <Card.Root class="border shadow-sm">
    <Card.Header class="px-6">
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Network List</Card.Title>
          <Card.Description>Manage container communication</Card.Description>
        </div>
        <div class="flex items-center gap-2">
          {#if selectedIds.length > 0}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    disabled={isDeletingSelected}
                    aria-label={`Group actions for ${selectedIds.length} selected network(s)`}
                  >
                    {#if isDeletingSelected}
                      <Loader2 class="w-4 h-4 animate-spin" />
                      Processing...
                    {:else}
                      Actions ({selectedIds.length})
                      <ChevronDown class="w-4 h-4" />
                    {/if}
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  onclick={() => (isConfirmDeleteDialogOpen = true)}
                  class="text-red-500 focus:!text-red-700"
                  disabled={isDeletingSelected}
                >
                  <Trash2 class="w-4 h-4" />
                  Delete Selected
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {/if}
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      {#if networks && networks.length > 0}
        <UniversalTable
          data={networks}
          {columns}
          idKey="id"
          display={{
            filterPlaceholder: "Search networks...",
            noResultsMessage: "No networks found",
          }}
          sort={{
            defaultSort: { id: "name", desc: false },
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
            <Button variant="outline" size="sm" onclick={openCreateDialog}>
              <Plus class="h-4 w-4" />
              Create Network
            </Button>
          </div>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <CreateNetworkDialog
    bind:open={isCreateDialogOpen}
    isCreating={isCreatingNetwork}
    onSubmit={handleCreateNetworkSubmit}
  />

  <Dialog.Root bind:open={isConfirmDeleteDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Delete Selected Networks</Dialog.Title>
        <Dialog.Description>
          Are you sure you want to delete {selectedIds.length} selected network(s)?
          This action cannot be undone. Networks currently in use by containers cannot
          be deleted.
        </Dialog.Description>
      </Dialog.Header>
      <div class="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onclick={() => (isConfirmDeleteDialogOpen = false)}
          disabled={isDeletingSelected}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={handleDeleteSelected}
          disabled={isDeletingSelected}
        >
          {#if isDeletingSelected}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" /> Deleting...
          {:else}
            Delete {selectedIds.length} Network{#if selectedIds.length > 1}s{/if}
          {/if}
        </Button>
      </div>
    </Dialog.Content>
  </Dialog.Root>
</div>
