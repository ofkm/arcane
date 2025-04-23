<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import {
    Play,
    CircleStop,
    Trash2,
    Settings,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Import,
  } from "@lucide/svelte";

  interface Props {
    id: string;
    status: string;
    name?: string;
    isExternal?: boolean;
  }

  let { id, status, name = id, isExternal = false }: Props = $props();

  const isRunning = status === "running" || status === "partially running";

  // Loading states
  let isStarting = $state(false);
  let isStopping = $state(false);
  let isRestarting = $state(false);
  let isRemoving = $state(false);
  let isImporting = $state(false);

  // Delete dialog state
  let deleteDialogOpen = $state(false);

  // Check if we're on the stack detail page or the stacks list page
  let isStackDetailPage = $derived($page.route.id === "/stacks/[stackId]");

  // Handle form submission with proper redirection
  const handleDeleteSubmit = () => {
    isRemoving = true;
    deleteDialogOpen = false;

    return async ({
      result,
    }: {
      result: { type: string; data?: { redirectTo?: string } };
    }) => {
      if (result.type === "success") {
        if (isStackDetailPage && result.data?.redirectTo) {
          // Only redirect if we're on the stack detail page
          goto(result.data.redirectTo);
        } else {
          // Otherwise just refresh the data
          await invalidateAll();
        }
      } else {
        // Handle errors
        console.error("Error removing stack:", result);
        // Show error message
      }
      isRemoving = false;
    };
  };

  // Handle import functionality
  const handleImport = () => {
    isImporting = true;
    return async ({}) => {
      await invalidateAll();
      isImporting = false;
    };
  };
</script>

<div class="flex items-center gap-2 justify-end">
  {#if isExternal}
    <!-- Show import button for external stacks -->
    <form method="POST" action="/api/stacks/import" use:enhance={handleImport}>
      <input type="hidden" name="stackId" value={id} />
      <input type="hidden" name="stackName" value={name} />

      <Button
        type="submit"
        size="sm"
        variant="outline"
        title="Import Stack to Arcane"
        disabled={isImporting}
        class="flex items-center"
      >
        {#if isImporting}
          <Loader2 class="h-4 w-4 mr-2 animate-spin" />
        {:else}
          <Import class="h-4 w-4 mr-2" />
        {/if}
        Import
      </Button>
    </form>
  {:else}
    <!-- Show regular action buttons for managed stacks -->
    {#if isRunning}
      <form
        method="POST"
        action="/stacks/{id}?/stop"
        use:enhance={() => {
          isStopping = true;
          return async ({ result }) => {
            await invalidateAll();
            isStopping = false;
          };
        }}
      >
        <Button
          type="submit"
          size="icon"
          variant="outline"
          title="Stop Stack"
          disabled={isStopping}
        >
          {#if isStopping}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <CircleStop class="h-4 w-4" />
          {/if}
        </Button>
      </form>
    {:else}
      <form
        method="POST"
        action="/stacks/{id}?/start"
        use:enhance={() => {
          isStarting = true;
          return async ({ result }) => {
            await invalidateAll();
            isStarting = false;
          };
        }}
      >
        <Button
          type="submit"
          size="icon"
          variant="outline"
          title="Start Stack"
          disabled={isStarting}
        >
          {#if isStarting}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <Play class="h-4 w-4" />
          {/if}
        </Button>
      </form>
    {/if}

    <form
      method="POST"
      action="/stacks/{id}?/restart"
      use:enhance={() => {
        isRestarting = true;
        return async ({ result }) => {
          await invalidateAll();
          isRestarting = false;
        };
      }}
    >
      <Button
        type="submit"
        size="icon"
        variant="outline"
        disabled={!isRunning || isRestarting}
        title="Restart Stack"
      >
        {#if isRestarting}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <RefreshCw class="h-4 w-4" />
        {/if}
      </Button>
    </form>

    <a href="/stacks/{id}">
      <Button size="icon" variant="outline" title="Edit Stack">
        <Settings class="h-4 w-4" />
      </Button>
    </a>

    <Button
      type="button"
      size="icon"
      variant="destructive"
      title="Remove Stack"
      onclick={() => (deleteDialogOpen = true)}
    >
      <Trash2 class="h-4 w-4" />
    </Button>
  {/if}

  <!-- Delete confirmation dialog -->
  {#if !isExternal}
    <Dialog.Root bind:open={deleteDialogOpen}>
      <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
          <div class="flex items-center gap-2 text-destructive">
            <AlertTriangle class="h-5 w-5" />
            <Dialog.Title>Delete Stack</Dialog.Title>
          </div>
          <Dialog.Description>
            Are you sure you want to remove stack "{name}"? This action cannot
            be undone.
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onclick={() => (deleteDialogOpen = false)}
          >
            Cancel
          </Button>

          <form
            method="POST"
            action="/stacks/{id}?/remove"
            use:enhance={handleDeleteSubmit}
          >
            <Button type="submit" variant="destructive" disabled={isRemoving}>
              {#if isRemoving}
                <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              {/if}
              Delete
            </Button>
          </form>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>
