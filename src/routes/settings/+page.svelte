<script lang="ts">
  import { run } from "svelte/legacy";
  import { enhance } from "$app/forms";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Save, RefreshCw } from "@lucide/svelte";
  import type { ActionData, PageData } from "./$types";
  import { toast } from "svelte-sonner";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { AlertCircle } from "@lucide/svelte";
  import AppSettings from "./tabs/app-settings.svelte";
  import UserManagement from "./tabs/user-management.svelte";
  import Authentication from "./tabs/authentication.svelte";
  import RbacSettings from "./tabs/rbac-settings.svelte";
  import ExternalServices from "./tabs/external-services.svelte";

  interface Props {
    data: PageData;
    form: ActionData;
  }

  let { data, form }: Props = $props();

  // Track active tab
  let activeTab = $state("app-settings");
  let saving = $state(false);

  // Keep the tab IDs consistent with the trigger values
  const tabs = [
    { id: "app-settings", label: "General", component: AppSettings },
    {
      id: "user-management",
      label: "User Management",
      component: UserManagement,
    },
    {
      id: "authentication",
      label: "Authentication",
      component: Authentication,
    },
    { id: "rbac", label: "RBAC", component: RbacSettings },
    {
      id: "external-services",
      label: "External Services",
      component: ExternalServices,
    },
  ];

  // Handle form submission result
  run(() => {
    if (form?.success) {
      toast.success("Settings saved successfully");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Configure Arcane's settings and permissions
      </p>
    </div>

    <Button type="submit" form="settings-form" disabled={saving} class="h-10">
      {#if saving}
        <RefreshCw class="mr-2 h-4 w-4 animate-spin" />
        Saving...
      {:else}
        <Save class="mr-2 h-4 w-4" />
        Save Settings
      {/if}
    </Button>
  </div>

  <!-- Alerts -->
  {#if form?.error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Error Saving Settings</Alert.Title>
      <Alert.Description>{form.error}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if form?.success}
    <Alert.Root
      variant="default"
      class="bg-primary/10 text-primary border border-primary"
    >
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Settings Saved</Alert.Title>
      <Alert.Description
        >Your settings have been updated successfully.</Alert.Description
      >
    </Alert.Root>
  {/if}

  <!-- Tabs Navigation -->
  <Tabs.Root
    value={activeTab}
    onValueChange={(val) => (activeTab = val)}
    class="w-full"
  >
    <Tabs.List
      class="grid grid-cols-5 sm:grid-cols-5 md:w-full md:max-w-3xl mb-4"
    >
      {#each tabs as tab}
        <Tabs.Trigger value={tab.id} class="whitespace-nowrap">
          {tab.label}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>

    <!-- Tab Contents -->
    <form
      method="POST"
      action="?"
      id="settings-form"
      class="space-y-6"
      use:enhance={() => {
        saving = true;
        return async ({ update }) => {
          saving = false;
          await update();
        };
      }}
    >
      <!-- Add a hidden input with a CSRF token -->
      <input type="hidden" name="csrf_token" value={data.csrf} />

      {#each tabs as tab}
        <Tabs.Content value={tab.id} class="space-y-4">
          <svelte:component this={tab.component} {data} {form} />
        </Tabs.Content>
      {/each}
    </form>
  </Tabs.Root>
</div>
