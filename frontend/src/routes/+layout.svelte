<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { navigating, page } from "$app/state";
  import ConfirmDialog from "$lib/components/confirm-dialog/confirm-dialog.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/sidebar/sidebar.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { initializeClientStores } from "$lib/stores/client-init";

  let { children, data } = $props();

  const versionInformation = data.versionInformation;
  const user = $derived(data.user);
  const agents = $derived(data.agents);
  const isNavigating = $derived(navigating.type !== null);
  const isAuthenticated = $derived(!!user);

  const isOnboardingPage = $derived(
    page.url.pathname.startsWith("/onboarding")
  );
  const isLoginPage = $derived(
    page.url.pathname === "/login" ||
      page.url.pathname.startsWith("/auth/login") ||
      page.url.pathname === "/auth" ||
      page.url.pathname.includes("/login")
  );
  const showSidebar = $derived(
    isAuthenticated && !isOnboardingPage && !isLoginPage
  );

  $effect(() => {
    const path = page.url.pathname;

    const publicPaths = [
      "/auth/login",
      "/auth/logout",
      "/auth/oidc/login",
      "/auth/oidc/callback",
      "/img",
      "/favicon.ico",
    ];

    const isPublicPath = publicPaths.some((p) => path.startsWith(p));

    if (!isPublicPath && !data.isAuthenticated) {
      fetch("/api/auth/me", {
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            goto(`/auth/login?redirect=${encodeURIComponent(path)}`);
          }
        })
        .catch(() => {
          goto(`/auth/login?redirect=${encodeURIComponent(path)}`);
        });
    }
  });

  onMount(() => {
    const init = async () => {
      await initializeClientStores();
    };

    init();
  });
</script>

<svelte:head><title>Arcane</title></svelte:head>

<ModeWatcher />
<Toaster />
<ConfirmDialog />

<!-- Loading Indicator -->
{#if isNavigating}
  <div class="fixed top-0 right-0 left-0 z-50 h-2">
    <div class="bg-primary h-full animate-pulse"></div>
  </div>
{/if}

<div class="bg-background flex min-h-screen">
  {#if showSidebar}
    <Sidebar.Provider>
      <AppSidebar
        hasLocalDocker={data.hasLocalDocker || false}
        agents={agents || []}
        {versionInformation}
        {user}
      />
      <main class="flex-1">
        <section class="p-6">
          {@render children()}
        </section>
      </main>
    </Sidebar.Provider>
  {:else}
    <main class="flex-1">
      {@render children()}
    </main>
  {/if}
</div>
