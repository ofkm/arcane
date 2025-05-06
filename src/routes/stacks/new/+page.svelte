<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, Loader2, Save, FileStack, FileCode } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { preventDefault } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiReponse } from '$lib/utils/api.util';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import EnvEditor from '$lib/components/env-editor.svelte';

	const stackApi = new StackAPIService();
	let saving = $state(false);

	const defaultComposeTemplate = `services:
  nginx:
    image: nginx:alpine
    container_name: nginx_service
    env_file:
      - .env
    ports:
      - "8080:80"
    volumes:
      - nginx_data:/usr/share/nginx/html
    restart: unless-stopped

volumes:
  nginx_data:
    driver: local
`;

	const defaultEnvTemplate = `# Environment Variables
# These variables will be available to your stack services
# Format: VARIABLE_NAME=value

NGINX_HOST=localhost
NGINX_PORT=80

# Example Database Configuration
# DB_USER=myuser
# DB_PASSWORD=mypassword
# DB_NAME=mydatabase
`;

	let name = $state('');
	let composeContent = $state(defaultComposeTemplate);
	let envContent = $state(defaultEnvTemplate);

	async function handleSubmit() {
		saving = true;

		handleApiReponse(
			// await tryCatch(stackApi.create(name, composeContent, envContent)),
			await tryCatch(stackApi.create(name, composeContent, envContent)),
			'Failed to Create Stack',
			(value) => (saving = value),
			async (data) => {
				toast.success(`Stack "${data.stack.name}" created with environment file.`);
				await invalidateAll();
				goto(`/stacks/${data.stack.id}`);
			}
		);
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

	<form class="space-y-6" onsubmit={preventDefault(handleSubmit)}>
		<Card.Root class="border shadow-sm">
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 p-2 rounded-full">
						<FileStack class="h-5 w-5 text-primary" />
					</div>
					<div>
						<Card.Title>Stack Configuration</Card.Title>
						<Card.Description>Create a new Docker Compose stack with environment variables</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="grid w-full max-w-sm items-center gap-1.5">
						<Label for="name">Stack Name</Label>
						<Input type="text" id="name" name="name" bind:value={name} required placeholder="e.g., my-web-app" disabled={saving} />
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="md:col-span-2 space-y-2">
							<Label for="compose-editor">Docker Compose File</Label>
							<div class="border rounded-md overflow-hidden h-[550px]">
								<YamlEditor bind:value={composeContent} readOnly={saving} />
							</div>
							<p class="text-xs text-muted-foreground">Enter a valid compose.yaml file.</p>
						</div>

						<div class="space-y-2">
							<Label for="env-editor" class="flex-1">Environment Configuration (.env)</Label>

							<div class="border rounded-md overflow-hidden h-[550px]">
								<EnvEditor bind:value={envContent} readOnly={saving} />
							</div>
							<p class="text-xs text-muted-foreground">Define environment variables in KEY=value format. These will be saved as a .env file in the stack directory.</p>
						</div>
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
