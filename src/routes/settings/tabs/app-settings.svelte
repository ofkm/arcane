<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Save, RefreshCw } from "@lucide/svelte";
  import type { ActionData, PageData } from "../$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  let settings = $derived(data.settings);

  // Update form values from form.values if there was an error, otherwise from settings
  let dockerHost = $derived(
    form?.values?.dockerHost || settings?.dockerHost || ""
  );
  let autoRefresh = $derived(
    form?.values?.autoRefresh !== undefined
      ? form.values.autoRefresh === "on"
      : settings?.autoRefresh || false
  );
  let refreshInterval = $derived(
    form?.values?.refreshInterval !== undefined
      ? form.values.refreshInterval
      : settings?.refreshInterval || 10
  );
  let darkMode = $derived(
    form?.values?.darkMode !== undefined
      ? form.values.darkMode === "on"
      : settings?.darkMode || false
  );
  let stacksDirectory = $derived(
    form?.values?.stacksDirectory || settings?.stacksDirectory || ""
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Docker Connection Card -->
  <Card.Root class="border shadow-sm">
    <Card.Header class="pb-3">
      <div class="flex items-center gap-2">
        <div class="bg-blue-500/10 p-2 rounded-full">
          <Save class="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <Card.Title>Docker Settings</Card.Title>
          <Card.Description>Configure your Docker connection</Card.Description>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        <div class="space-y-2">
          <label for="dockerHost" class="text-sm font-medium">Docker Host</label
          >
          <Input
            type="text"
            id="dockerHost"
            name="dockerHost"
            bind:value={dockerHost}
            placeholder="unix:///var/run/docker.sock"
            required
          />
          <p class="text-xs text-muted-foreground">
            For local Docker: unix:///var/run/docker.sock (Unix) or
            npipe:////./pipe/docker_engine (Windows)
          </p>
        </div>

        <div class="space-y-2">
          <label for="stacksDirectory" class="text-sm font-medium"
            >Stacks Directory</label
          >
          <Input
            type="text"
            id="stacksDirectory"
            name="stacksDirectory"
            bind:value={stacksDirectory}
            placeholder="/app/data/stacks"
            required
          />
          <p class="text-xs text-muted-foreground">
            Directory where Docker Compose stacks will be stored inside the
            container.
          </p>
          <p class="text-xs font-bold text-destructive">
            Changing this setting will not move existing stacks!
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <div class="space-y-6">
    <!-- Auto Refresh Settings Card -->
    <Card.Root class="border shadow-sm">
      <Card.Header class="pb-3">
        <div class="flex items-center gap-2">
          <div class="bg-amber-500/10 p-2 rounded-full">
            <RefreshCw class="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <Card.Title>Auto Refresh</Card.Title>
            <Card.Description>Control data refresh behavior</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div
          class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
        >
          <div class="space-y-0.5">
            <label for="autoRefreshSwitch" class="text-base font-medium"
              >Auto Refresh</label
            >
            <p class="text-sm text-muted-foreground">
              Automatically refresh data periodically
            </p>
          </div>
          <Switch
            id="autoRefreshSwitch"
            name="autoRefresh"
            bind:checked={autoRefresh}
          />
        </div>

        {#if autoRefresh}
          <div class="space-y-2 px-1">
            <label for="refreshInterval" class="text-sm font-medium">
              Refresh Interval (seconds)
            </label>
            <Input
              id="refreshInterval"
              name="refreshInterval"
              type="number"
              bind:value={refreshInterval}
              min="5"
              max="60"
            />
            {#if form?.error && form.values?.refreshInterval && (parseInt(String(form.values.refreshInterval), 10) < 5 || parseInt(String(form.values.refreshInterval), 10) > 60)}
              <p class="text-sm text-destructive">Must be between 5 and 60.</p>
            {:else}
              <p class="text-xs text-muted-foreground">
                Set between 5-60 seconds. Lower values increase server load.
              </p>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- UI Settings Card -->
    <Card.Root class="border shadow-sm">
      <Card.Header class="pb-3">
        <div class="flex items-center gap-2">
          <div class="bg-purple-500/10 p-2 rounded-full">
            <Save class="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <Card.Title>UI Settings</Card.Title>
            <Card.Description>Customize the appearance</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div
          class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
        >
          <div class="space-y-0.5">
            <label for="darkModeSwitch" class="text-base font-medium"
              >Dark Mode</label
            >
            <p class="text-sm text-muted-foreground">
              Enable the dark color theme
            </p>
          </div>
          <Switch id="darkModeSwitch" name="darkMode" bind:checked={darkMode} />
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>
