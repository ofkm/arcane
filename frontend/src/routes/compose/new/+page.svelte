<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, FileStack, Terminal, Copy, Loader2, Wand } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import { preventDefault } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import { defaultEnvTemplate, defaultComposeTemplate } from '$lib/constants';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import DropdownCard from '$lib/components/dropdown-card.svelte';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import TemplateSelectionDialog from '$lib/components/dialogs/template-selection-dialog.svelte';
	import { environmentAPI } from '$lib/services/api';
	import type { Template } from '$lib/types/template.type';
	import type { PageProps } from './+page';

	let { data }: { data: PageProps } = $props();

	let saving = $state(false);
	let converting = $state(false);
	let showTemplateDialog = $state(false);

	let name = $state('');
	let composeContent = $state(data.defaultTemplate || defaultComposeTemplate);
	let envContent = $state(data.envTemplate || defaultEnvTemplate);
	let dockerRunCommand = $state('');

	async function handleSubmit() {
		await handleCreateStack();
	}

	async function handleCreateStack() {
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.deployStack(name, composeContent, envContent)),
			message: 'Failed to Create Stack',
			setLoadingState: (value) => (saving = value),
			onSuccess: async (stack) => {
				toast.success(`Stack "${name}" created successfully.`);
				await invalidateAll();
				goto(`/compose/${stack.name}`);
			}
		});
	}

	async function handleConvertDockerRun() {
		if (!dockerRunCommand.trim()) {
			toast.error('Please enter a docker run command');
			return;
		}

		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.convertDockerRun(dockerRunCommand)),
			message: 'Failed to Convert Docker Run Command',
			setLoadingState: (value) => (converting = value),
			onSuccess: (data) => {
				composeContent = data.composeContent;

				if (!name.trim() && dockerRunCommand.includes('--name ')) {
					const nameMatch = dockerRunCommand.match(/--name\s+(\S+)/);
					if (nameMatch) {
						name = nameMatch[1];
					}
				}

				toast.success('Docker run command converted successfully!');
				dockerRunCommand = '';
			}
		});
	}

	function handleTemplateSelect(template: Template) {
		composeContent = template.content;

		if (template.envContent) {
			envContent = template.envContent;
		}

		if (!name.trim()) {
			name = template.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		}

		toast.success(`Template "${template.name}" loaded successfully!`);
	}

	const exampleCommands = [
		'docker run -d --name nginx -p 8080:80 -v nginx_data:/usr/share/nginx/html nginx:alpine',
		'docker run -d --name postgres -e POSTGRES_DB=mydb -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -v postgres_data:/var/lib/postgresql/data postgres:15',
		'docker run -d --name redis -p 6379:6379 --restart unless-stopped redis:alpine'
	];

	function useExample(command: string) {
		dockerRunCommand = command;
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/compose">Compose</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>New Project</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<h1 class="mt-2 text-2xl font-bold tracking-tight">Create New Compose Project</h1>
		</div>
	</div>

	<!-- Docker Run to Compose Converter -->
	<DropdownCard id="docker-run-converter" title="Docker Run to Compose Converter" description="Convert existing docker run commands to Docker Compose format" icon={Terminal}>
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="dockerRunCommand">Docker Run Command</Label>
				<Textarea id="dockerRunCommand" bind:value={dockerRunCommand} placeholder="docker run -d --name my-app -p 8080:80 nginx:alpine" rows={3} disabled={converting} class="font-mono text-sm" />
			</div>

			<div class="flex items-center gap-2">
				<Button type="button" disabled={!dockerRunCommand.trim() || converting} size="sm" onclick={handleConvertDockerRun}>
					{#if converting}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Converting...
					{:else}
						<Wand class="mr-2 size-4" />
						Convert to Compose
					{/if}
				</Button>
			</div>

			<div class="space-y-2">
				<Label class="text-muted-foreground text-xs">Example Commands:</Label>
				<div class="space-y-1">
					{#each exampleCommands as command}
						<Button type="button" variant="ghost" size="sm" class="h-auto w-full justify-start p-2 text-left font-mono text-xs" onclick={() => useExample(command)}>
							<Copy class="mr-2 size-3" />
							{command}
						</Button>
					{/each}
				</div>
			</div>
		</div>
	</DropdownCard>

	<form class="space-y-6" onsubmit={preventDefault(handleSubmit)}>
		<Card.Root class="border shadow-sm">
			<Card.Header>
				<div class="flex w-full items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="bg-primary/10 rounded-full p-2">
							<FileStack class="text-primary size-5" />
						</div>
						<div>
							<Card.Title>Compose Project Configuration</Card.Title>
							<Card.Description>Create a new Docker Compose Project with environment variables</Card.Description>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<ArcaneButton action="template" onClick={() => (showTemplateDialog = true)} loading={saving} disabled={saving || converting} />
						<ArcaneButton action="create" onClick={handleSubmit} loading={saving} disabled={!name || !composeContent} />
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="grid w-full max-w-sm items-center gap-1.5">
						<Label for="name">Compose Project Name</Label>
						<Input type="text" id="name" name="name" bind:value={name} required placeholder="e.g., my-web-app" disabled={saving} />
					</div>

					<Resizable.PaneGroup direction="horizontal">
						<Resizable.Pane>
							<div class="mr-3 space-y-2">
								<Label for="compose-editor" class="mb-2">Docker Compose File</Label>
								<div class="mt-2 h-[550px] overflow-hidden rounded-md border">
									<YamlEditor bind:value={composeContent} readOnly={saving} />
								</div>
							</div>
						</Resizable.Pane>
						<Resizable.Handle />
						<Resizable.Pane defaultSize={25}>
							<div class="ml-3 space-y-2">
								<Label for="env-editor" class="mb-2">Environment Configuration (.env)</Label>
								<div class="mt-2 h-[550px] overflow-hidden rounded-md border">
									<!-- Add a unique key to force re-render -->
									{#key `env-${envContent.length}`}
										<EnvEditor bind:value={envContent} readOnly={saving} />
									{/key}
								</div>
							</div>
						</Resizable.Pane>
					</Resizable.PaneGroup>
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-between">
				<Button variant="outline" type="button" onclick={() => window.history.back()} disabled={saving}>
					<ArrowLeft class="mr-2 size-4" />
					Cancel
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>

<!-- Template Selection Dialog -->
<TemplateSelectionDialog bind:open={showTemplateDialog} templates={data.composeTemplates || []} onSelect={handleTemplateSelect} />
