<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, Loader2, AlertCircle, Save, FileStack } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';

	let saving = $state(false);
	let apiError = $state<string | null>(null);

	function preventDefault(fn: (event: Event) => void) {
		return function (this: unknown, event: Event) {
			event.preventDefault();
			fn.call(this, event);
		};
	}

	const defaultComposeTemplate = `services:
  nginx:
    image: nginx:alpine
    container_name: nginx_service
    ports:
      - "8080:80"
    volumes:
      - nginx_data:/usr/share/nginx/html
    restart: unless-stopped

volumes:
  nginx_data:
    driver: local
`;

	let name = $state('');
	let composeContent = $state(defaultComposeTemplate);

	async function handleSubmit() {
		saving = true;
		apiError = null;

		try {
			const response = await fetch('/api/stacks/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name, composeContent })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || `HTTP error! status: ${response.status}`);
			}

			toast.success(result.message || `Stack "${result.stack.name}" created.`);
			await invalidateAll();
			goto(`/stacks/${result.stack.id}`);
		} catch (err: unknown) {
			console.error('Failed to create stack:', err);
			const message = err instanceof Error ? err.message : 'An unknown error occurred.';
			apiError = message;
			toast.error(`Failed to create stack: ${apiError}`);
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6 pb-8">
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

	{#if apiError}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Failed to Create Stack</Alert.Title>
			<Alert.Description>{apiError}</Alert.Description>
		</Alert.Root>
	{/if}

	<form class="space-y-6" onsubmit={preventDefault(handleSubmit)}>
		<Card.Root class="border shadow-sm">
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 p-2 rounded-full">
						<FileStack class="h-5 w-5 text-primary" />
					</div>
					<div>
						<Card.Title>Stack Configuration</Card.Title>
						<Card.Description>Create a new Docker Compose stack</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="grid w-full max-w-sm items-center gap-1.5">
						<Label for="name">Stack Name</Label>
						<Input type="text" id="name" name="name" bind:value={name} required placeholder="e.g., my-web-app" disabled={saving} />
					</div>

					<div class="grid w-full items-center gap-1.5">
						<Label for="compose-editor">Docker Compose File</Label>

						<YamlEditor bind:value={composeContent} readOnly={saving} />

						<p class="text-xs text-muted-foreground">Enter a valid compose.yaml file.</p>
					</div>
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-between">
				<Button variant="outline" type="button" onclick={() => window.history.back()} disabled={saving}>
					<ArrowLeft class="w-4 h-4 mr-2" />
					Cancel
				</Button>
				<Button type="submit" variant="default" disabled={saving || !name || !composeContent}>
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
