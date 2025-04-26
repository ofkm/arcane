<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Play,
    StopCircle,
    RotateCcw,
    Download,
    Rocket,
    RefreshCw,
    Trash2,
    Loader2,
  } from "@lucide/svelte";

  type TargetType = "container" | "stack";
  type LoadingStates = {
    start?: boolean;
    stop?: boolean;
    restart?: boolean;
    pull?: boolean;
    deploy?: boolean;
    redeploy?: boolean;
    remove?: boolean;
  };

  let {
    id,
    type = "container",
    state = "stopped",
    loading = {},
    formAction = null,
  }: {
    id: string;
    type?: TargetType;
    state?: string;
    loading?: LoadingStates;
    formAction?: string | null;
  } = $props();

  const isRunning = $derived(
    state === "running" || (type === "stack" && state === "partially running")
  );
</script>

<div class="flex items-center gap-2">
  {#if !isRunning}
    <Button
      type="submit"
      variant="default"
      disabled={loading.start}
      class="font-medium "
      formaction={formAction || "?/start"}
    >
      {#if loading.start}
        <Loader2 class="w-4 h-4 mr-2 animate-spin" />
      {:else}
        <Play class="w-4 h-4 mr-2" />
      {/if}
      {type === "stack" ? "Deploy" : "Start"}
    </Button>
  {:else}
    <Button
      type="submit"
      variant="secondary"
      disabled={loading.stop}
      class="font-medium "
      formaction={formAction || "?/stop"}
    >
      {#if loading.stop}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <StopCircle class="w-4 h-4" />
      {/if}
      Stop
    </Button>

    <Button
      type="submit"
      variant="outline"
      disabled={loading.restart}
      class="font-medium "
      formaction={formAction || "?/restart"}
      name="action"
      value="restart"
    >
      {#if loading.restart}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <RotateCcw class="w-4 h-4" />
      {/if}
      Restart
    </Button>
  {/if}

  {#if type === "container"}
    <Button
      type="submit"
      variant="destructive"
      disabled={loading.remove}
      class="font-medium "
      formaction={formAction || "?/remove"}
      onclick={(e) => {
        if (!confirm(`Are you sure you want to remove this ${type}?`)) {
          e.preventDefault();
          return false;
        }
      }}
    >
      {#if loading.remove}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <Trash2 class="w-4 h-4" />
      {/if}
      Remove
    </Button>
  {:else}
    <!-- Stack-specific actions -->
    <Button
      type="submit"
      variant="outline"
      disabled={loading.pull}
      class="font-medium"
      formaction={formAction || "?/pull"}
    >
      {#if loading.pull}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <Download class="w-4 h-4" />
      {/if}
      Pull
    </Button>

    <Button
      type="submit"
      variant="destructive"
      disabled={loading.remove}
      class="font-medium "
      formaction={formAction || "?/remove"}
      onclick={(e) => {
        if (!confirm(`Are you sure you want to remove this ${type}?`)) {
          e.preventDefault();
          return false;
        }
      }}
    >
      {#if loading.remove}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <Trash2 class="w-4 h-4" />
      {/if}
      Remove
    </Button>
  {/if}
</div>
