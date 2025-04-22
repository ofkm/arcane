<script lang="ts">
  import Ellipsis from "@lucide/svelte/icons/ellipsis";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { goto } from "$app/navigation";
  import { Eye, Play, RotateCcw, StopCircle, Trash2 } from "@lucide/svelte";

  let { id }: { id: string } = $props();

  function viewContainer() {
    goto(`/containers/${id}`);
  }
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
        View</DropdownMenu.Item
      >
      <DropdownMenu.Item onclick={() => viewContainer()}>
        <Play class="w-4 h-4" />
        Start</DropdownMenu.Item
      >
      <DropdownMenu.Item onclick={() => viewContainer()}>
        <RotateCcw class="w-4 h-4" />
        Restart</DropdownMenu.Item
      >
      <DropdownMenu.Item onclick={() => viewContainer()}>
        <StopCircle class="w-4 h-4" />
        Stop</DropdownMenu.Item
      >
      <DropdownMenu.Item
        class="text-red-500 focus:!text-red-700"
        onclick={() => viewContainer()}
      >
        <Trash2 class="w-4 h-4" />
        Remove</DropdownMenu.Item
      >
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
