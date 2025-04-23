<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Database, CircuitBoard } from "@lucide/svelte";
  import type { ActionData, PageData } from "../$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  let settings = $derived(data.settings);

  // Valkey settings
  let valkeyEnabled = $derived(
    form?.values?.valkeyEnabled !== undefined
      ? form.values.valkeyEnabled === "on"
      : settings?.externalServices?.valkey?.enabled || false
  );

  let valkeyHost = $derived(
    form?.values?.valkeyHost ||
      settings?.externalServices?.valkey?.host ||
      "localhost"
  );

  let valkeyPort = $derived(
    form?.values?.valkeyPort !== undefined
      ? form.values.valkeyPort
      : settings?.externalServices?.valkey?.port || 6379
  );

  let valkeyUsername = $derived(
    form?.values?.valkeyUsername ||
      settings?.externalServices?.valkey?.username ||
      ""
  );

  let valkeyPassword = $derived(
    form?.values?.valkeyPassword ||
      settings?.externalServices?.valkey?.password ||
      ""
  );

  let valkeyKeyPrefix = $derived(
    form?.values?.valkeyKeyPrefix ||
      settings?.externalServices?.valkey?.keyPrefix ||
      "arcane:settings:"
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-1 gap-6">
  <!-- External Services Header -->
  <div class="space-y-2">
    <h2 class="text-2xl font-bold tracking-tight">External Services</h2>
    <p class="text-muted-foreground">
      Configure connections to external services for enhanced functionality.
    </p>
  </div>

  <!-- Valkey/Redis Card -->
  <Card.Root class="border shadow-sm">
    <Card.Header class="pb-3">
      <div class="flex items-center gap-2">
        <div class="bg-purple-500/10 p-2 rounded-full">
          <Database class="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <Card.Title>Valkey/Redis Integration</Card.Title>
          <Card.Description>
            Connect to Valkey or Redis for distributed caching and state
            management
          </Card.Description>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        <div
          class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
        >
          <div class="space-y-0.5">
            <label for="valkeyEnabledSwitch" class="text-base font-medium"
              >Enable Valkey/Redis</label
            >
            <p class="text-sm text-muted-foreground">
              Use Valkey/Redis for enhanced performance and reliability
            </p>
          </div>
          <Switch
            id="valkeyEnabledSwitch"
            name="valkeyEnabled"
            bind:checked={valkeyEnabled}
          />
        </div>

        {#if valkeyEnabled}
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
          >
            <div class="space-y-2">
              <label for="valkeyHost" class="text-sm font-medium"
                >Server Host</label
              >
              <Input
                type="text"
                id="valkeyHost"
                name="valkeyHost"
                bind:value={valkeyHost}
                placeholder="localhost"
                required
              />
            </div>

            <div class="space-y-2">
              <label for="valkeyPort" class="text-sm font-medium"
                >Server Port</label
              >
              <Input
                type="number"
                id="valkeyPort"
                name="valkeyPort"
                bind:value={valkeyPort}
                placeholder="6379"
                required
              />
            </div>

            <div class="space-y-2">
              <label for="valkeyUsername" class="text-sm font-medium"
                >Username</label
              >
              <Input
                type="text"
                id="valkeyUsername"
                name="valkeyUsername"
                bind:value={valkeyUsername}
                placeholder="(optional)"
              />
            </div>

            <div class="space-y-2">
              <label for="valkeyPassword" class="text-sm font-medium"
                >Password</label
              >
              <Input
                type="password"
                id="valkeyPassword"
                name="valkeyPassword"
                bind:value={valkeyPassword}
                placeholder="(optional)"
              />
            </div>

            <div class="space-y-2 md:col-span-2">
              <label for="valkeyKeyPrefix" class="text-sm font-medium"
                >Key Prefix</label
              >
              <Input
                type="text"
                id="valkeyKeyPrefix"
                name="valkeyKeyPrefix"
                bind:value={valkeyKeyPrefix}
                placeholder="arcane:settings:"
              />
              <p class="text-xs text-muted-foreground">
                Prefix used for keys when storing values in Valkey/Redis
              </p>
            </div>

            <div
              class="md:col-span-2 p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
            >
              <p class="text-sm">
                <span class="font-medium">Usage:</span> When enabled, Valkey/Redis
                will be used for caching and distributed state management, improving
                performance.
              </p>
            </div>
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Placeholder for future services -->
  <Card.Root class="border shadow-sm border-dashed">
    <Card.Header class="pb-3">
      <div class="flex items-center gap-2">
        <div class="bg-gray-500/10 p-2 rounded-full">
          <CircuitBoard class="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <Card.Title>Additional Services</Card.Title>
          <Card.Description>
            More integrations will be available in future updates
          </Card.Description>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="text-center py-8 text-muted-foreground">
        <p>
          Future services MAY include database connections, monitoring tools,
          and more.
        </p>
        <p class="text-sm mt-2">
          Check back for updates or suggest integrations!
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
