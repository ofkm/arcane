<script lang="ts">
  import { preventDefault } from "svelte/legacy";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Loader2 } from "@lucide/svelte";

  // Functions for events
  export function onClose() {
    open = false;
  }

  interface Props {
    // Simple boolean prop for open state
    open?: boolean;
    isCreating?: boolean;
    onSubmit?: any;
  }

  let {
    open = $bindable(false),
    isCreating = false,
    onSubmit = (data: { name: string }) => {},
  }: Props = $props();

  // Internal state
  let volumeName = $state("");
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Create New Volume</Dialog.Title>
      <Dialog.Description>
        Enter the details for the new Docker volume.
      </Dialog.Description>
    </Dialog.Header>

    <form
      onsubmit={preventDefault(() => onSubmit({ name: volumeName }))}
      class="grid gap-4 py-4"
    >
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="volume-name" class="text-right">Name</Label>
        <Input
          id="volume-name"
          bind:value={volumeName}
          class="col-span-3"
          placeholder="e.g., my-app-data"
          required
          disabled={isCreating}
        />
      </div>
    </form>

    <Dialog.Footer>
      <Button variant="outline" onclick={onClose} disabled={isCreating}>
        Cancel
      </Button>
      <Button
        type="submit"
        onclick={() => onSubmit({ name: volumeName })}
        disabled={isCreating || !volumeName.trim()}
      >
        {#if isCreating}
          <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Creating...
        {:else}
          Create Volume
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
