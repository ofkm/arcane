<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Trash2, Download, Ellipsis, Loader2 } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";

  let { id, repoTag }: { id: string; repoTag?: string } = $props();
  let isPulling = $state(false);

  function removeImage() {
    // TODO: Implement API call to remove image
    console.log("Attempting to remove image:", id, repoTag);
    alert(`Implement remove action for image ID: ${id.substring(0, 12)}`);
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

      setTimeout(async () => {
        await invalidateAll();
      }, 500);
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
        onclick={removeImage}
      >
        <Trash2 class="mr-2 h-4 w-4" />
        Remove
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
