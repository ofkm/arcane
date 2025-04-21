<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Trash2, Download, Ellipsis, Loader2 } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let { id, repoTag }: { id: string; repoTag?: string } = $props();
  let isPulling = $state(false);
  let isDeleting = $state(false);
  let isConfirmDialogOpen = $state(false);

  async function removeImage() {
    isDeleting = true;
    try {
      const response = await fetch(`/api/images/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      toast.success(
        `Image ${repoTag || id.substring(0, 12)} deleted successfully.`
      );
      isConfirmDialogOpen = false;

      window.location.href = `${window.location.pathname}?t=${Date.now()}`;
    } catch (err: any) {
      console.error(`Failed to delete image:`, err);
      toast.error(`Failed to delete image: ${err.message}`);
    } finally {
      isDeleting = false;
    }
  }

  async function pullImage() {
    if (!repoTag) {
      toast.error("Cannot pull image without a repository tag");
      return;
    }

    isPulling = true;
    try {
      let [imageRef, tag] = repoTag.split(":");
      tag = tag || "latest";

      const encodedImageRef = encodeURIComponent(imageRef);

      const response = await fetch(`/api/images/pull/${encodedImageRef}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      toast.success(`Image "${repoTag}" pulled successfully.`);

      window.location.href = `${window.location.pathname}?t=${Date.now()}`;
    } catch (err: any) {
      console.error(`Failed to pull image "${repoTag}":`, err);
      toast.error(`Failed to pull image: ${err.message}`);
    } finally {
      isPulling = false;
    }
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
      <DropdownMenu.Item onclick={pullImage} disabled={isPulling || !repoTag}>
        {#if isPulling}
          <Loader2 class="h-4 w-4 animate-spin" />
          Pulling...
        {:else}
          <Download class="mr-2 h-4 w-4" />
          Pull
        {/if}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-red-500 focus:!text-red-700"
        onclick={() => (isConfirmDialogOpen = true)}
      >
        <Trash2 class="mr-2 h-4 w-4" />
        Remove
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root
  open={isConfirmDialogOpen}
  onOpenChange={(open) => (isConfirmDialogOpen = open)}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm Deletion</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete the image <span class="font-bold"
          >{repoTag || id.substring(0, 12)}</span
        >? This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="ghost" onclick={() => (isConfirmDialogOpen = false)}>
        Cancel
      </Button>
      <Button variant="destructive" onclick={removeImage} disabled={isDeleting}>
        {#if isDeleting}
          <Loader2 class="h-4 w-4 animate-spin" />
          Deleting...
        {:else}
          Delete
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
