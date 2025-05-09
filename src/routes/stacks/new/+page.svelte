<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, Loader2, Save, FileStack } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { preventDefault } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import { defaultEnvTemplate, defaultComposeTemplate } from '$lib/constants';

	const stackApi = new StackAPIService();
	let saving = $state(false);

	let name = $state('');
	let composeContent = $state(defaultComposeTemplate);
	let envContent = $state(defaultEnvTemplate);

	async function handleSubmit() {
		handleApiResultWithCallbacks({
			result: await tryCatch(stackApi.create(name, composeContent, envContent)),
			message: 'Failed to Create Stack',
			setLoadingState: (value) => (saving = value),
			onSuccess: async () => {
				toast.success(`Stack "${name}" created with environment file.`);
				await invalidateAll();
				goto(`/stacks/${name}`);
			}
		});
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
							<Label for="compose-editor" class="mb-2">Docker Compose File</Label>
							<div class="border rounded-md overflow-hidden h-[550px] mt-2">
								<YamlEditor bind:value={composeContent} readOnly={saving} />
							</div>
							<p class="text-xs text-muted-foreground">Enter a valid compose.yaml file.</p>
						</div>

						<div class="space-y-2">
							<Label for="env-editor" class="mb-2">Environment Configuration (.env)</Label>

							<div class="border rounded-md overflow-hidden h-[550px] mt-2">
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
