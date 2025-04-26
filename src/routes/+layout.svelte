<!-- @migration task: review uses of `navigating` -->
<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import Nav from "$lib/components/navbar.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { navigating } from "$app/state";

  let { children, data } = $props();

  const versionInformation = data.versionInformation;

  const isNavigating = $derived(navigating !== null);
</script>

<svelte:head><title>Arcane</title></svelte:head>

<ModeWatcher />
<Toaster />

<!-- Apply a loading state to the page during navigation -->
{#if isNavigating}
  <!-- add a loading indicator heret -->
{/if}

<div class="flex min-h-screen bg-background">
  <Nav {versionInformation} />

  <main class="flex-1">
    <section class="p-6">
      {@render children()}
    </section>
  </main>
</div>
