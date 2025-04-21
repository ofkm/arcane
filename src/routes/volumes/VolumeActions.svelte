<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Trash2, AlertCircle, Loader2 } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  const { name } = $props<{ name: string }>();

  let isConfirmDialogOpen = $state(false);
  let isDeleting = $state(false);

  async function deleteVolume() {
    isDeleting = true;
    try {
      const response = await fetch(`/api/volumes/${name}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      toast.success(`Volume "${name}" deleted successfully.`);
      isConfirmDialogOpen = false;

      window.location.href = `${window.location.pathname}?t=${Date.now()}`;
    } catch (err: any) {
      console.error(`Failed to delete volume "${name}":`, err);
      toast.error(`Failed to delete volume: ${err.message}`);
    } finally {
      isDeleting = false;
    }
  }
</script>

<div class="flex gap-2">
  <Button
    variant="destructive"
    size="sm"
    title="Delete Volume"
    onclick={() => (isConfirmDialogOpen = true)}
  >
    <Trash2 class="w-4 h-4" />
  </Button>

  <Dialog.Root bind:open={isConfirmDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Delete Volume</Dialog.Title>
        <Dialog.Description>
          Are you sure you want to delete volume "{name}"? This action cannot be
          undone.
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onclick={() => (isConfirmDialogOpen = false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={deleteVolume}
          disabled={isDeleting}
        >
          {#if isDeleting}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Deleting...
          {:else}
            Delete
          {/if}
        </Button>
      </div>
    </Dialog.Content>
  </Dialog.Root>
</div>
