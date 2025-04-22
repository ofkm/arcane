<script lang="ts">
  import type { ActionData } from "./$types";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Save,
    FileStack,
  } from "@lucide/svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";

  import { oneDark } from "@codemirror/theme-one-dark";
  import { browser } from "$app/environment";

  import YamlEditor from "$lib/components/yaml-editor.svelte";

  let { form }: { form: ActionData } = $props();

  let saving = $state(false);
  let darkMode = $state(false);

  // Check for dark mode preference
  $effect(() => {
    if (browser) {
      darkMode =
        window.matchMedia("(prefers-color-scheme: dark)").matches ||
        document.documentElement.classList.contains("dark");
    }
  });

  // Set up CodeMirror extensions
  let extensions = $state([oneDark]);

  // Dynamic theme based on dark mode
  $effect(() => {
    extensions = darkMode ? [oneDark] : [];
  });

  // Default compose file template
  const defaultComposeTemplate = `services:
  web:
    image: nginx:alpine
    container_name: my_web_container
    restart: unless-stopped
    volumes:
      - ./data:/var/www/html
    ports:
      - 8080:80
`;

  let name = $state("");
  let composeContent = $state(defaultComposeTemplate);
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
            <Breadcrumb.Page>New Stack</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <h1 class="text-2xl font-bold tracking-tight mt-2">Create New Stack</h1>
    </div>
  </div>

  <!-- Error Alert -->
  {#if form?.error}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4 mr-2" />
      <Alert.Title>Failed to Create Stack</Alert.Title>
      <Alert.Description>{form.error}</Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Stack Editor -->
  <form
    method="POST"
    class="space-y-6"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => {
        saving = false;
        await update();
      };
    }}
  >
    <Card.Root class="border shadow-sm">
      <Card.Header>
        <div class="flex items-center gap-3">
          <div class="bg-primary/10 p-2 rounded-full">
            <FileStack class="h-5 w-5 text-primary" />
          </div>
          <div>
            <Card.Title>Stack Configuration</Card.Title>
            <Card.Description
              >Create a new Docker Compose stack</Card.Description
            >
          </div>
        </div>
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
              placeholder="e.g., my-web-app"
            />
          </div>

          <div class="grid w-full items-center gap-1.5">
            <Label for="compose-editor">Docker Compose File</Label>

            <!-- Hidden textarea to submit the form value -->
            <input type="hidden" name="composeContent" value={composeContent} />

            <!-- YamlEditor Component -->
            <YamlEditor bind:value={composeContent} />

            <p class="text-xs text-muted-foreground">
              Enter a valid compose.yaml file.
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
          Cancel
        </Button>
        <Button type="submit" variant="default" disabled={saving}>
          {#if saving}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
          {:else}
            <Save class="w-4 h-4 mr-2" />
          {/if}
          Create Stack
        </Button>
      </Card.Footer>
    </Card.Root>
  </form>
</div>
