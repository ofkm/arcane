<script lang="ts">
  import Ellipsis from "@lucide/svelte/icons/ellipsis";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { goto } from "$app/navigation";
  import { Eye, Play, RotateCcw, StopCircle, Trash2 } from "@lucide/svelte";

  let { id, state }: { id: string; state: string } = $props();

  function viewContainer() {
    goto(`/containers/${id}`);
  }

  function performContainerAction(action: string) {
    // Log the action for now - will be replaced with API call later
    console.log(`Container ${id}: Performing action: ${action}`);

    /*
  try {
    // Will implement fetch call to backend API endpoint
    // await fetch(`/api/containers/${id}/${action}`, {
    //   method: 'POST'
    // });
    console.log(`Successfully performed ${action} on container ${id}`);
  } catch (error) {
    console.error(`Failed to ${action} container ${id}:`, error);
  }
  */
  }

  // Determine if container is running
  const isRunning = $derived(state === "running");
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="relative size-8 p-0"
      >
        <span class="sr-only">Open menu</span>
        <Ellipsis />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Item onclick={() => viewContainer()}>
        <Eye class="w-4 h-4" />
        View
      </DropdownMenu.Item>

      {#if !isRunning}
        <DropdownMenu.Item onclick={() => performContainerAction("start")}>
          <Play class="w-4 h-4" />
          Start
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item onclick={() => performContainerAction("restart")}>
          <RotateCcw class="w-4 h-4" />
          Restart
        </DropdownMenu.Item>

        <DropdownMenu.Item onclick={() => performContainerAction("stop")}>
          <StopCircle class="w-4 h-4" />
          Stop
        </DropdownMenu.Item>
      {/if}

      <DropdownMenu.Item
        class="text-red-500 focus:!text-red-700"
        onclick={() => performContainerAction("remove")}
      >
        <Trash2 class="w-4 h-4" />
        Remove
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
