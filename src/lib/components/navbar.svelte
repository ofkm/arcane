<script lang="ts">
  import {
    Home,
    Box,
    Image,
    Network,
    HardDrive,
    Settings,
    Menu,
    X,
    ChevronRight,
    ChevronLeft,
    FileStack,
    ExternalLink, // Add this for the update link icon
    type Icon as IconType,
  } from "@lucide/svelte";
  import { page } from "$app/state";
  import { fly } from "svelte/transition";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { cn } from "$lib/utils";
  import { browser } from "$app/environment";
  import type { AppVersionInformation } from "$lib/types/application-configuration";

  // Menu items and version information with proper typing
  let {
    items = [
      { href: "/", label: "Dashboard", icon: Home },
      { href: "/containers", label: "Containers", icon: Box },
      { href: "/stacks", label: "Stacks", icon: FileStack },
      { href: "/images", label: "Images", icon: Image },
      { href: "/networks", label: "Networks", icon: Network },
      { href: "/volumes", label: "Volumes", icon: HardDrive },
      { href: "/settings", label: "Settings", icon: Settings },
    ] as MenuItem[],
    versionInformation,
  } = $props<{
    items?: MenuItem[];
    versionInformation?: AppVersionInformation;
  }>();

  // Define MenuItem type with proper IconType
  type MenuItem = {
    href: string;
    label: string;
    icon: typeof IconType;
  };

  // State for mobile sidebar
  let isOpen = $state(false);

  // State for sidebar collapse (desktop)
  let isCollapsed = $state(false);

  // Initialize from localStorage if available
  if (browser) {
    const savedState = localStorage.getItem("sidebarCollapsed");
    isCollapsed = savedState === "true";
  }

  // Save collapsed state to localStorage
  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (browser) {
      localStorage.setItem("sidebarCollapsed", isCollapsed.toString());
    }
  }

  // Determine if update is available
  const updateAvailable = $derived(versionInformation?.updateAvailable);
</script>

<!-- Mobile menu button -->
<Button
  variant="ghost"
  size="icon"
  class="md:hidden fixed top-4 right-4 z-50 shadow-sm bg-background"
  onclick={() => (isOpen = !isOpen)}
  aria-label={isOpen ? "Close menu" : "Open menu"}
>
  {#if isOpen}
    <X size={18} />
  {:else}
    <Menu size={18} />
  {/if}
</Button>

<!-- Sidebar navigation -->
<div
  class={cn(
    "fixed md:sticky top-0 left-0 h-screen md:h-[100dvh] transition-all duration-300 ease-in-out",
    "bg-card border-r shadow-sm z-40",
    "flex flex-col",
    isCollapsed ? "w-[70px]" : "w-64",
    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  )}
>
  <!-- Logo/App name -->
  <div
    class={cn(
      "flex items-center h-14 transition-all duration-300",
      isCollapsed ? "justify-center px-2" : "gap-3 px-5 p-4"
    )}
  >
    <div class="flex-shrink-0">
      <img
        src="/img/arcane.png"
        alt="Arcane"
        class="h-15 w-15"
        width="30"
        height="30"
      />
    </div>
    {#if !isCollapsed}
      <div class="flex flex-col justify-center">
        <span class="text-lg font-bold tracking-tight leading-none">Arcane</span
        >
        <span class="text-xs text-muted-foreground"
          >v{versionInformation.currentVersion}</span
        >
      </div>
    {/if}
  </div>

  <Separator />

  <!-- Collapse button (positioned between header and navigation) -->
  <div class="hidden md:flex justify-end px-2 -mt-1 mb-1 relative">
    <Button
      variant="outline"
      size="icon"
      class="h-6 w-6 rounded-full bg-background absolute right-0 translate-x-1/2"
      onclick={toggleCollapse}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {#if isCollapsed}
        <ChevronRight size={14} />
      {:else}
        <ChevronLeft size={14} />
      {/if}
    </Button>
  </div>

  <!-- Navigation links -->
  <nav
    class={cn(
      "p-2 flex-1 overflow-y-auto overflow-x-hidden",
      isCollapsed && "py-2 px-1"
    )}
  >
    {#each items as item}
      {@const isActive =
        page.url.pathname === item.href ||
        (page.url.pathname.startsWith(item.href) && item.href !== "/")}
      {@const Icon = item.icon}

      <a
        href={item.href}
        class={cn(
          "flex items-center justify-between rounded-md text-sm font-medium transition-all",
          isCollapsed ? "px-2 py-2 my-1 flex-col gap-1" : "px-3 py-2 my-0.5",
          "transition-colors group",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-current={isActive ? "page" : undefined}
        title={isCollapsed ? item.label : undefined}
      >
        <div
          class={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <div
            class={cn(
              "p-1 rounded-md",
              isActive
                ? "bg-primary/10"
                : "bg-transparent group-hover:bg-muted-foreground/10"
            )}
          >
            <Icon
              size={16}
              class={cn(
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          </div>
          {#if !isCollapsed}
            <span>{item.label}</span>
          {/if}
        </div>

        {#if !isCollapsed}
          {#if isActive}
            <ChevronRight size={16} class="text-primary opacity-60" />
          {/if}
        {/if}
      </a>
    {/each}
  </nav>

  <!-- Only show update section if an update is available -->
  {#if updateAvailable}
    <Separator />

    <!-- Update available notification -->
    <div
      class={cn("transition-all px-3 py-2", isCollapsed ? "text-center" : "")}
    >
      {#if !isCollapsed}
        <a
          href={versionInformation.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between text-blue-500 hover:underline text-sm"
        >
          <span>Update available</span>
          <span class="flex items-center">
            v{versionInformation.newestVersion}
            <ExternalLink class="ml-1 h-3 w-3" />
          </span>
        </a>
      {:else}
        <a
          href={versionInformation.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Update available: v{versionInformation.newestVersion}"
          class="flex justify-center text-blue-500"
        >
          <ExternalLink class="h-4 w-4" />
        </a>
      {/if}
    </div>
  {/if}
</div>

<!-- Overlay for mobile -->
{#if isOpen}
  <button
    type="button"
    class="md:hidden fixed inset-0 w-full h-full bg-background/80 backdrop-blur-sm z-30 border-none"
    aria-label="Close menu"
    onclick={() => (isOpen = false)}
    transition:fly={{ duration: 150, y: -5 }}
  ></button>
{/if}
