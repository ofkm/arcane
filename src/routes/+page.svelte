<script lang="ts">
  import type { PageData } from "./$types";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import UniversalTable from "$lib/components/universal-table.svelte";
  import StatusBadge from "$lib/components/docker/StatusBadge.svelte";
  import { dashboardContainerColumns, dashboardImageColumns } from "./columns";
  import {
    AlertCircle,
    Box,
    HardDrive,
    Cpu,
    MemoryStick,
    ArrowRight,
    PlayCircle,
    StopCircle,
    Trash2,
  } from "@lucide/svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { invalidateAll } from "$app/navigation";
  import { formatBytes } from "$lib/utils";

  let { data }: { data: PageData } = $props();
  const { dockerInfo, containers, images, error } = data;
  let isRefreshing = $state(false);

  // Calculate running containers count
  const runningContainers = $derived(
    containers?.filter((c) => c.state === "running").length ?? 0
  );

  // Calculate stopped containers count
  const stoppedContainers = $derived(
    containers?.filter((c) => c.state === "exited").length ?? 0
  );
</script>

<div class="space-y-8">
  <!-- Header with refresh button -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Overview of your Docker environment
      </p>
    </div>
    <!-- Dont remove this button -->
    <!-- <Button
      variant="outline"
      size="sm"
      class="h-9"
      onclick={refreshData}
      disabled={isRefreshing}
    >
      <RefreshCw class={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button> -->
  </div>

  {#if error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Connection Error</Alert.Title>
      <Alert.Description>
        {error} Please check your Docker connection in
        <a href="/settings" class="underline">Settings</a>.
      </Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Engine Overview Section -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold tracking-tight">Engine Overview</h2>
      {#if dockerInfo}
        <Badge variant="outline" class="text-xs font-normal">
          v{dockerInfo.ServerVersion || "Unknown"}
        </Badge>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Running Containers Card -->
      <Card.Root class="overflow-hidden border-l-4 border-l-green-500">
        <Card.Content class="p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-muted-foreground">
                Running Containers
              </p>
              <div class="mt-1">
                <p class="text-2xl font-bold">
                  {runningContainers}
                  <span class="text-xs font-normal text-muted-foreground ml-1"
                    >/ {containers?.length || 0}</span
                  >
                </p>
              </div>
            </div>
            <div class="bg-green-500/10 p-2 rounded-full">
              <Box class="h-5 w-5 text-green-500" />
            </div>
          </div>
          {#if containers?.length}
            <Progress
              value={(runningContainers / containers.length) * 100}
              class="h-1 mt-4"
            />
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Images Card -->
      <Card.Root class="overflow-hidden border-l-4 border-l-blue-500">
        <Card.Content class="p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Images</p>
              <p class="text-2xl font-bold mt-1">{dockerInfo?.Images || 0}</p>
            </div>
            <div class="bg-blue-500/10 p-2 rounded-full">
              <HardDrive class="h-5 w-5 text-blue-500" />
            </div>
          </div>
          {#if images?.length && dockerInfo?.Images}
            <div class="mt-4 text-xs text-muted-foreground">
              Showing {Math.min(images.length, 5)} of {dockerInfo.Images} images
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- CPU Card -->
      <Card.Root class="overflow-hidden border-l-4 border-l-purple-500">
        <Card.Content class="p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-muted-foreground">CPU</p>
              <p class="text-2xl font-bold mt-1">{dockerInfo?.NCPU || "N/A"}</p>
            </div>
            <div class="bg-purple-500/10 p-2 rounded-full">
              <Cpu class="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div class="mt-4 text-xs text-muted-foreground">
            {dockerInfo?.Architecture || "Unknown architecture"}
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Memory Card -->
      <Card.Root class="overflow-hidden border-l-4 border-l-amber-500">
        <Card.Content class="p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Memory</p>
              <p class="text-2xl font-bold mt-1">
                {formatBytes(dockerInfo?.MemTotal, 0)}
              </p>
            </div>
            <div class="bg-amber-500/10 p-2 rounded-full">
              <MemoryStick class="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div class="mt-4 text-xs text-muted-foreground">
            {dockerInfo?.OperatingSystem || "Unknown OS"}
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- Quick Actions Section -->
  <section>
    <h2 class="text-lg font-semibold tracking-tight mb-4">Quick Actions</h2>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card.Root class="flex flex-col justify-center items-center p-5 h-full">
        <Button
          class="w-full"
          disabled={!dockerInfo || stoppedContainers === 0}
          variant="default"
        >
          <PlayCircle class="h-4 w-4 mr-2" />
          Start All Stopped
          <Badge variant="secondary" class="ml-2">{stoppedContainers}</Badge>
        </Button>
        <p class="text-xs text-muted-foreground mt-2">
          Start all stopped containers
        </p>
      </Card.Root>

      <Card.Root class="flex flex-col justify-center items-center p-5 h-full">
        <Button
          class="w-full"
          variant="secondary"
          disabled={!dockerInfo || runningContainers === 0}
        >
          <StopCircle class="h-4 w-4 mr-2" />
          Stop All Running
          <Badge variant="outline" class="ml-2">{runningContainers}</Badge>
        </Button>
        <p class="text-xs text-muted-foreground mt-2">
          Stop all running containers
        </p>
      </Card.Root>

      <Card.Root class="flex flex-col justify-center items-center p-5 h-full">
        <Button class="w-full" variant="destructive" disabled={!dockerInfo}>
          <Trash2 class="h-4 w-4 mr-2" />
          Prune System
        </Button>
        <p class="text-xs text-muted-foreground mt-2">Remove unused data</p>
      </Card.Root>
    </div>
  </section>

  <!-- Resources Section -->
  <section>
    <h2 class="text-lg font-semibold tracking-tight mb-4">Resources</h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Containers List -->
      <Card.Root class="border shadow-sm relative flex flex-col">
        <Card.Header class="px-6">
          <div class="flex items-center justify-between">
            <div>
              <Card.Title>Containers</Card.Title>
              <Card.Description class="pb-3">Recent containers</Card.Description
              >
            </div>
            <Button
              variant="ghost"
              size="sm"
              href="/containers"
              disabled={!dockerInfo}
            >
              View All
              <ArrowRight class="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card.Header>
        <Card.Content class="p-0 flex-1">
          {#if containers?.length > 0}
            <div class="flex flex-col h-full">
              <div class="flex-1">
                <UniversalTable
                  data={containers.slice(0, 5)}
                  columns={dashboardContainerColumns}
                  features={{
                    filtering: false,
                    selection: false,
                  }}
                  pagination={{
                    pageSize: 5,
                    pageSizeOptions: [5],
                  }}
                  display={{
                    isDashboardTable: true,
                  }}
                />
              </div>
              {#if containers.length > 5}
                <div
                  class="bg-muted/40 py-2 px-6 text-xs text-muted-foreground border-t"
                >
                  Showing 5 of {containers.length} containers
                </div>
              {/if}
            </div>
          {:else if !error}
            <div
              class="flex flex-col items-center justify-center py-10 px-6 text-center"
            >
              <Box class="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
              <p class="text-sm text-muted-foreground">No containers found</p>
              <p class="text-xs text-muted-foreground mt-1">
                Use Docker CLI or another tool to create containers
              </p>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Images List -->
      <Card.Root class="border shadow-sm relative flex flex-col">
        <Card.Header class="px-6">
          <div class="flex items-center justify-between">
            <div>
              <Card.Title>Images</Card.Title>
              <Card.Description class="pb-3">Recent images</Card.Description>
            </div>
            <Button
              variant="ghost"
              size="sm"
              href="/images"
              disabled={!dockerInfo}
            >
              View All
              <ArrowRight class="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card.Header>
        <Card.Content class="p-0 flex-1">
          {#if images?.length > 0}
            <div class="flex flex-col h-full">
              <div class="flex-1">
                <UniversalTable
                  data={images.slice(0, 5)}
                  columns={dashboardImageColumns}
                  features={{
                    filtering: false,
                    selection: false,
                  }}
                  pagination={{
                    pageSize: 5,
                    pageSizeOptions: [5],
                  }}
                  display={{
                    isDashboardTable: true,
                  }}
                  sort={{
                    defaultSort: { id: "repo", desc: false },
                  }}
                />
              </div>
              {#if images.length > 5}
                <div
                  class="bg-muted/40 py-2 px-6 text-xs text-muted-foreground border-t"
                >
                  Showing 5 of {images.length} images
                </div>
              {/if}
            </div>
          {:else if !error}
            <div
              class="flex flex-col items-center justify-center py-10 px-6 text-center"
            >
              <HardDrive
                class="h-8 w-8 text-muted-foreground mb-2 opacity-40"
              />
              <p class="text-sm text-muted-foreground">No images found</p>
              <p class="text-xs text-muted-foreground mt-1">
                Pull images using Docker CLI or another tool
              </p>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- Footer Links -->
  <section class="border-t pt-4 mt-10">
    <div
      class="flex justify-between items-center text-muted-foreground text-sm"
    >
      <div>
        <a href="/settings" class="hover:underline">Settings</a>
        <span class="mx-2">•</span>
        <a
          href="https://github.com/ofkm/arcane"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline">GitHub</a
        >
      </div>
      <div>
        {#if dockerInfo}
          <span title="Docker Engine Version">v{dockerInfo.ServerVersion}</span>
        {/if}
      </div>
    </div>
  </section>
</div>
