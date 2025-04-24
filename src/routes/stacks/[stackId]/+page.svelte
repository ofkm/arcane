<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Save,
    FileStack,
    Layers,
    ArrowRight,
  } from "@lucide/svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import YamlEditor from "$lib/components/yaml-editor.svelte";
  import { onMount } from "svelte";
  import ActionButtons from "$lib/components/action-buttons.svelte";
  import CustomBadge from "$lib/components/badges/custom-badge.svelte";
  import { capitalizeFirstLetter, getStatusColor } from "$lib/utils";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let { stack } = $derived(data);

  let depoloying = $state(false);
  let stopping = $state(false);
  let restarting = $state(false);
  let removing = $state(false);
  let saving = $state(false);

  let name = $state("");
  let composeContent = $state("");
  let editorReady = $state(false);

  $effect(() => {
    if (stack) {
      name = stack.name || "";
      composeContent = stack.composeContent || "";

      console.log("Stack data loaded:", {
        name,
        composeLength: composeContent.length,
      });
    }
  });

  $effect(() => {
    depoloying = false;
    stopping = false;
    restarting = false;
    removing = false;
    saving = false;
  });

  onMount(() => {
    setTimeout(() => {
      editorReady = true;
    }, 100);
  });
</script>

<div class="space-y-6 pb-8">
  <!-- Breadcrumb Navigation -->
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/stacks">Stacks</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{stack?.name || "Loading..."}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <div class="mt-2 flex items-center gap-2">
        <h1 class="text-2xl font-bold tracking-tight">
          {stack?.name || "Stack Details"}
        </h1>
      </div>
    </div>

    {#if stack}
      <div class="flex gap-2 flex-wrap">
        <form
          method="POST"
          action={stack.status === "running" ||
          stack.status === "partially running"
            ? "?/stop"
            : "?/start"}
          use:enhance={() => {
            const isStarting =
              stack.status !== "running" &&
              stack.status !== "partially running";
            if (isStarting) depoloying = true;
            else stopping = true;
            return async ({ update }) => {
              await update({ reset: false });
            };
          }}
        >
          <input
            type="hidden"
            name="action"
            value={stack.status === "running" ||
            stack.status === "partially running"
              ? "stop"
              : "start"}
          />
          <ActionButtons
            id={stack.id}
            type="stack"
            state={stack.status}
            loading={{
              start: depoloying,
              stop: stopping,
              restart: restarting,
              remove: removing,
            }}
          />
        </form>
      </div>
    {/if}
  </div>

  <!-- Error Alert -->
  {#if form?.error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Action Failed</Alert.Title>
      <Alert.Description>{form.error}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if stack}
    <!-- Stack Details Section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card.Root>
        <Card.Content class="p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Services</p>
            <p class="text-2xl font-bold">{stack.serviceCount}</p>
          </div>
          <div class="bg-primary/10 p-2 rounded-full">
            <Layers class="h-5 w-5 text-primary" />
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">
              Running Services
            </p>
            <p class="text-2xl font-bold">{stack.runningCount}</p>
          </div>
          <div class="bg-green-500/10 p-2 rounded-full">
            <Layers class="h-5 w-5 text-green-500" />
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Created</p>
            <p class="text-lg font-medium">
              {new Date(stack.createdAt).toLocaleString()}
            </p>
          </div>
          <div class="bg-blue-500/10 p-2 rounded-full">
            <FileStack class="h-5 w-5 text-blue-500" />
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Stack Editor -->
    <form
      method="POST"
      action="?/update"
      class="space-y-6"
      use:enhance={() => {
        saving = true;
        return async ({ update }) => {
          saving = false;
          await update({ reset: false });
        };
      }}
    >
      <Card.Root class="border shadow-sm">
        <Card.Header>
          <Card.Title>Stack Configuration</Card.Title>
          <Card.Description
            >Edit stack settings and compose file</Card.Description
          >
        </Card.Header>
        <Card.Content>
          <div class="space-y-4">
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="name">Stack Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                bind:value={name}
                required
              />
            </div>

            <div class="grid w-full items-center gap-1.5">
              <Label for="compose-editor">Docker Compose File</Label>
              <input
                type="hidden"
                name="composeContent"
                value={composeContent}
              />
              {#key editorReady || composeContent}
                <YamlEditor
                  value={composeContent}
                  on:change={(e) => (composeContent = e.detail.value)}
                  height="400px"
                  placeholder="Enter your docker-compose.yml content"
                  forceDarkTheme={true}
                />
              {/key}
              <p class="text-xs text-muted-foreground">
                Edit your docker-compose.yml file directly. Syntax errors will
                be highlighted.
              </p>
            </div>
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-between">
          <Button
            variant="outline"
            type="button"
            onclick={() => window.history.back()}
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" variant="default" disabled={saving}>
            {#if saving}
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            {:else}
              <Save class="w-4 h-4 mr-2" />
            {/if}
            Save Changes
          </Button>
        </Card.Footer>
      </Card.Root>
    </form>

    <!-- Service List -->
    <Card.Root class="border shadow-sm">
      <Card.Header>
        <Card.Title>Services</Card.Title>
        <Card.Description>Containers in this stack</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#if stack.services && stack.services.length > 0}
            {#each stack.services as service}
              <a
                href={service.id ? `/containers/${service.id}` : undefined}
                class={`flex items-center justify-between p-3 border rounded-md ${
                  service.id
                    ? "hover:bg-muted/50 transition-colors cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <div class="flex items-center gap-3">
                  <div class="bg-muted rounded-md p-1">
                    <Layers class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="font-medium">{service.name}</p>
                    <p class="text-xs text-muted-foreground">
                      {service.id ? service.id.substring(0, 12) : "Not created"}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <CustomBadge
                    variant="status"
                    text={capitalizeFirstLetter(
                      service.state?.Status || "unknown"
                    )}
                    bgColor={getStatusColor(service.state?.Status || "unknown")
                      .bg}
                    textColor={getStatusColor(
                      service.state?.Status || "unknown"
                    ).text}
                  />
                  {#if service.id}
                    <div class="text-xs text-blue-500 ml-2">
                      <span class="hidden sm:inline">View details</span>
                      <ArrowRight class="inline-block ml-1 h-3 w-3" />
                    </div>
                  {/if}
                </div>
              </a>
            {/each}
          {:else}
            <div class="text-center py-6 text-muted-foreground">
              <p>No services defined in this stack</p>
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <div
      class="flex flex-col items-center justify-center py-12 border rounded-lg shadow-sm bg-card"
    >
      <div class="rounded-full bg-muted/50 p-4 mb-4">
        <AlertCircle class="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 class="text-lg font-medium mb-2">Stack Not Found</h2>
      <p class="text-center text-muted-foreground max-w-md">
        Could not load stack data. It may have been removed or the Docker engine
        is not accessible.
      </p>
      <div class="flex gap-3 mt-6">
        <Button variant="outline" href="/stacks">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Stacks
        </Button>
      </div>
    </div>
  {/if}
</div>
