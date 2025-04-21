<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Loader2 } from "@lucide/svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import * as Select from "$lib/components/ui/select/index.js";

  function preventDefault(handler: (event: SubmitEvent) => void) {
    return (event: SubmitEvent) => {
      event.preventDefault();
      handler(event);
    };
  }

  export function onClose() {
    open = false;
  }

  interface Props {
    open?: boolean;
    isPulling?: boolean;
    onSubmit?: any;
  }

  let {
    open = $bindable(false),
    isPulling = false,
    onSubmit = (data: {
      imageRef: string;
      tag?: string;
      platform?: string;
    }) => {},
  }: Props = $props();

  let imageRef = $state("");
  let tag = $state("latest");
  let platform = $state("");

  // Available platforms
  const platforms = [
    { label: "Default", value: "" },
    { label: "linux/amd64", value: "linux/amd64" },
    { label: "linux/arm64", value: "linux/arm64" },
    { label: "linux/arm/v7", value: "linux/arm/v7" },
    { label: "windows/amd64", value: "windows/amd64" },
  ];

  function handleSubmit() {
    if (!imageRef.trim()) return;

    let urlPath = imageRef.trim();
    let imageTag = tag || "latest";

    if (urlPath.includes(":")) {
      const parts = urlPath.split(":");
      urlPath = parts[0];
      imageTag = parts[1];
    }

    onSubmit({
      imageRef: urlPath,
      tag: imageTag,
      platform: platform || undefined,
    });
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Pull Docker Image</Dialog.Title>
      <Dialog.Description>
        Enter the image reference you want to pull from a registry.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
      <!-- Basic image settings -->
      <div class="flex flex-col gap-2">
        <Label for="image-ref">Image</Label>
        <div class="flex items-center gap-2">
          <div class="flex-1">
            <Input
              id="image-ref"
              bind:value={imageRef}
              placeholder="e.g., nginx or ubuntu"
              required
              disabled={isPulling}
            />
          </div>
          <div class="flex items-center">
            <span class="text-lg font-medium text-muted-foreground">:</span>
          </div>
          <div class="w-1/3">
            <Input
              id="image-tag"
              bind:value={tag}
              placeholder="latest"
              disabled={isPulling}
            />
          </div>
        </div>
      </div>

      <!-- Advanced settings -->
      <Accordion.Root type="single">
        <Accordion.Item value="advanced">
          <Accordion.Trigger>Advanced Settings</Accordion.Trigger>
          <Accordion.Content>
            <div class="grid gap-4 pt-2">
              <div class="flex flex-col gap-2">
                <Label for="platform">Platform</Label>
                <Select.Root
                  type="single"
                  bind:value={platform}
                  disabled={isPulling}
                >
                  <Select.Trigger class="w-full" id="platform">
                    <span>
                      {platforms.find((p) => p.value === platform)?.label ||
                        "Select platform"}
                    </span>
                  </Select.Trigger>
                  <Select.Content>
                    {#each platforms as platformOption}
                      <Select.Item value={platformOption.value}>
                        {platformOption.label}
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>

                <!-- Help text moved outside the grid -->
                <p class="text-xs text-muted-foreground mt-1">
                  Platform specifies the architecture and OS for
                  multi-architecture images. Leave empty to use your system's
                  default platform.
                </p>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </form>

    <Dialog.Footer>
      <Button variant="outline" onclick={onClose} disabled={isPulling}>
        Cancel
      </Button>
      <Button
        type="submit"
        onclick={handleSubmit}
        disabled={isPulling || !imageRef.trim()}
      >
        {#if isPulling}
          <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Pulling...
        {:else}
          Pull Image
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
