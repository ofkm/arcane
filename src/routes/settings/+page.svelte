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

  interface Props {
    data: PageData;
    form: ActionData;
  }

  let { data, form }: Props = $props();

  // Track active tab
  let activeTab = $state("app-settings");
  let saving = $state(false);

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
      class="grid grid-cols-4 sm:grid-cols-4 md:w-full md:max-w-3xl mb-4"
    >
      <Tabs.Trigger value="app-settings" class="whitespace-nowrap">
        General
      </Tabs.Trigger>
      <Tabs.Trigger value="user-management" class="whitespace-nowrap">
        User Management
      </Tabs.Trigger>
      <Tabs.Trigger value="authentication" class="whitespace-nowrap">
        Authentication
      </Tabs.Trigger>
      <Tabs.Trigger value="rbac" class="whitespace-nowrap">RBAC</Tabs.Trigger>
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

      <Tabs.Content value="app-settings" class="space-y-4">
        <AppSettings {data} {form} />
      </Tabs.Content>

      <Tabs.Content value="user-management" class="space-y-4">
        <UserManagement {data} {form} />
      </Tabs.Content>

      <Tabs.Content value="authentication" class="space-y-4">
        <Authentication {data} {form} />
      </Tabs.Content>

      <Tabs.Content value="rbac" class="space-y-4">
        <RbacSettings {data} {form} />
      </Tabs.Content>
    </form>
  </Tabs.Root>
</div>
