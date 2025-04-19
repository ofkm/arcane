<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import Nav from "$lib/components/navbar.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  let { children } = $props();
</script>

<svelte:head><title>Arcane</title></svelte:head>

<ModeWatcher />
<Toaster />

<div class="flex min-h-screen bg-background">
  <Nav />

  <main class="flex-1">
    <section class="p-6">
      {@render children()}
    </section>
  </main>
</div>
