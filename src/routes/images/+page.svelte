<script lang="ts">
  import type { PageData } from "./$types";
  import DataTable from "$lib/components/data-table.svelte";
  import { columns } from "./columns";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Download,
    AlertCircle,
    RefreshCw,
    Filter,
    ArrowUpDown,
    HardDrive,
  } from "@lucide/svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import PullImageDialog from "./pull-image-dialog.svelte";

  let { data }: { data: PageData } = $props();
  const { images, error } = data;

  let isRefreshing = $state(false);
  let isPullDialogOpen = $state(false);
  let isPullingImage = $state(false);
  let pullProgress = $state(0);

  const totalImages = $derived(images?.length || 0);

  const totalSize = $derived(
    images?.reduce((acc, img) => acc + (img.size || 0), 0) || 0
  );

  async function handlePullImageSubmit(event: {
    imageRef: string;
    tag?: string;
    platform?: string;
  }) {
    const { imageRef, tag = "latest", platform } = event;

    isPullingImage = true;
    let currentPullProgress = $state(0);

    try {
      const encodedImageRef = encodeURIComponent(imageRef);
      const eventSource = new EventSource(
        `/api/images/pull-stream/${encodedImageRef}?tag=${tag}${platform ? `&platform=${platform}` : ""}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.error) {
          eventSource.close();
          toast.error(`Pull failed: ${data.error}`);
          isPullingImage = false;
          return;
        }

        if (data.progress !== undefined) {
          console.log("Progress update:", data.progress);
          currentPullProgress = data.progress;
          pullProgress = data.progress;
        }

        if (data.complete) {
          eventSource.close();
          const fullImageRef = `${imageRef}:${tag}`;
          toast.success(`Image "${fullImageRef}" pulled successfully.`);
          isPullDialogOpen = false;

          window.location.href = `${window.location.pathname}?t=${Date.now()}`;
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource error:", err);
        eventSource.close();
        toast.error("Connection to server lost while pulling image");
        isPullingImage = false;
      };
    } catch (err: any) {
      console.error("Failed to pull image:", err);
      toast.error(`Failed to pull image: ${err.message}`);
      isPullingImage = false;
    }
  }

  async function refreshData() {
    isRefreshing = true;
    await invalidateAll();
    setTimeout(() => {
      isRefreshing = false;
    }, 500);
  }

  function openPullDialog() {
    isPullDialogOpen = true;
  }

  function formatBytes(bytes: number | undefined | null, decimals = 1): string {
    if (!bytes || !+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
</script>

<div class="space-y-6">
  <!-- Header with refresh and pull buttons -->
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Docker Images</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Manage your Docker images
      </p>
    </div>
    <div class="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={refreshData}
        disabled={isRefreshing}
      >
        <RefreshCw class={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
      <Button variant="outline" size="sm" onclick={openPullDialog}>
        <Download class="w-4 h-4" />
        Pull Image
      </Button>
    </div>
  </div>

  {#if error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Error Loading Images</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Image stats summary -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Total Images</p>
          <p class="text-2xl font-bold">{totalImages}</p>
        </div>
        <div class="bg-blue-500/10 p-2 rounded-full">
          <HardDrive class="h-5 w-5 text-blue-500" />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Total Size</p>
          <p class="text-2xl font-bold">{formatBytes(totalSize)}</p>
        </div>
        <div class="bg-purple-500/10 p-2 rounded-full">
          <HardDrive class="h-5 w-5 text-purple-500" />
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main images table -->
  {#if images && images.length > 0}
    <Card.Root class="border shadow-sm">
      <Card.Header class="px-6">
        <div class="flex items-center justify-between">
          <div>
            <Card.Title>
              Image List
              <Badge variant="secondary" class="ml-2">{totalImages}</Badge>
            </Card.Title>
            <Card.Description
              >View and manage your Docker images</Card.Description
            >
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" class="hidden sm:flex">
              <Filter class="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" class="hidden sm:flex">
              <ArrowUpDown class="h-4 w-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <DataTable data={images} {columns} />
      </Card.Content>
    </Card.Root>
  {:else if !error}
    <div
      class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card"
    >
      <HardDrive class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
      <p class="text-lg font-medium">No images found</p>
      <p class="text-sm text-muted-foreground mt-1 max-w-md">
        Pull a new image using the "Pull Image" button above or use the Docker
        CLI
      </p>
      <div class="flex gap-3 mt-4">
        <Button variant="outline" size="sm" onclick={refreshData}>
          <RefreshCw class="h-4 w-4" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onclick={openPullDialog}>
          <Download class="h-4 w-4" />
          Pull Image
        </Button>
      </div>
    </div>
  {/if}

  <PullImageDialog
    bind:open={isPullDialogOpen}
    isPulling={isPullingImage}
    {pullProgress}
    onSubmit={handlePullImageSubmit}
  />
</div>
