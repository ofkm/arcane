<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import WandIcon from '@lucide/svelte/icons/wand';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import CodeEditor from '$lib/components/editor.svelte';
	import { preventDefault } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { defaultComposeTemplate } from '$lib/constants';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import TemplateSelectionDialog from '$lib/components/dialogs/template-selection-dialog.svelte';
	import { environmentAPI, converterAPI } from '$lib/services/api';
	import type { Template } from '$lib/types/template.type';

	let { data } = $props();

	let saving = $state(false);
	let converting = $state(false);
	let showTemplateDialog = $state(false);
	let showConverterDialog = $state(false);
	let isLoadingTemplateContent = $state(false);

	let name = $state('');
	let composeContent = $state(data.defaultTemplate || defaultComposeTemplate);
	let envContent = $state(data.envTemplate);
	let dockerRunCommand = $state('');

	async function handleSubmit() {
		await handleCreateProject();
	}

	async function handleCreateProject() {
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.deployProject(name, composeContent, envContent)),
			message: 'Failed to Create Project',
			setLoadingState: (value) => (saving = value),
			onSuccess: async (project) => {
				toast.success(`Project "${name}" created successfully.`);
				goto(`/compose/${project.id}`, { invalidateAll: true });
			}
		});
	}

	async function handleConvertDockerRun() {
		if (!dockerRunCommand.trim()) {
			toast.error('Please enter a docker run command');
			return;
		}

		handleApiResultWithCallbacks({
			result: await tryCatch(converterAPI.convert(dockerRunCommand)),
			message: 'Failed to Convert Docker Run Command',
			setLoadingState: (value) => (converting = value),
			onSuccess: (data) => {
				composeContent = data.dockerCompose;
				envContent = data.envVars;
				name = data.serviceName;

				toast.success('Docker run command converted successfully!');
				dockerRunCommand = '';
				showConverterDialog = false;
			}
		});
	}

	async function handleTemplateSelect(template: Template) {
		showTemplateDialog = false;

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

<div class="bg-background min-h-screen">
	<div class="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
		<div class="max-w-full px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button variant="ghost" size="sm" href="/compose">
						<ArrowLeftIcon class="size-4" />
						Back
					</Button>
					<div class="bg-border h-4 w-px"></div>
					<div class="flex items-center gap-2">
						<h1 class="text-lg font-semibold">Create New Project</h1>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Dialog.Root bind:open={showConverterDialog}>
						<Dialog.Trigger>
							<Button variant="outline" class="arcane-button-restart" disabled={saving || converting || isLoadingTemplateContent}>
								<TerminalIcon class="mr-2 size-4" />
								Convert Docker Run
							</Button>
						</Dialog.Trigger>
						<Dialog.Content class="max-h-[80vh] sm:max-w-[800px]">
							<Dialog.Header>
								<Dialog.Title>Docker Run to Compose Converter</Dialog.Title>
								<Dialog.Description>Convert existing docker run commands to Docker Compose format</Dialog.Description>
							</Dialog.Header>
							<div class="max-h-[60vh] space-y-4 overflow-y-auto">
								<div class="space-y-2">
									<Label for="dockerRunCommand">Docker Run Command</Label>
									<Textarea
										id="dockerRunCommand"
										bind:value={dockerRunCommand}
										placeholder="docker run -d --name my-app -p 8080:80 nginx:alpine"
										rows={3}
										disabled={converting}
										class="font-mono text-sm"
									/>
								</div>

								<div class="space-y-2">
									<Label class="text-muted-foreground text-xs">Example Commands:</Label>
									<div class="space-y-1">
										{#each exampleCommands as command}
											<Button
												type="button"
												variant="ghost"
												size="sm"
												class="h-auto w-full justify-start whitespace-normal break-all p-2 text-left font-mono text-xs"
												onclick={() => useExample(command)}
											>
												<CopyIcon class="mr-2 size-3 shrink-0" />
												<span class="truncate">{command}</span>
											</Button>
										{/each}
									</div>
								</div>
							</div>
							<div class="flex w-full justify-end pt-4">
								<Button type="button" disabled={!dockerRunCommand.trim() || converting} onclick={handleConvertDockerRun}>
									{#if converting}
										<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
										Converting...
									{:else}
										<WandIcon class="mr-2 size-4" />
										Convert to Compose
									{/if}
								</Button>
							</div>
						</Dialog.Content>
					</Dialog.Root>
					<ArcaneButton
						action="template"
						onclick={() => (showTemplateDialog = true)}
						loading={saving || isLoadingTemplateContent}
						disabled={saving || converting || isLoadingTemplateContent}
					/>
					<ArcaneButton
						action="create"
						onclick={() => handleSubmit()}
						loading={saving}
						disabled={!name || !composeContent || saving || converting || isLoadingTemplateContent}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-none p-6">
		<div class="space-y-8">
			<form class="space-y-6" onsubmit={preventDefault(handleSubmit)}>
				<div class="mb-6 space-y-2">
					<Label for="name" class="text-sm font-medium">Project Name</Label>
					<div class="max-w-md">
						<Input
							type="text"
							id="name"
							name="name"
							bind:value={name}
							required
							placeholder="e.g., my-web-app"
							disabled={saving || isLoadingTemplateContent}
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div class="lg:col-span-2">
						<div class="space-y-4">
							<h3 class="text-lg font-semibold">Docker Compose File</h3>
							<div class="h-[590px] w-full overflow-hidden rounded-md">
								<CodeEditor
									bind:value={composeContent}
									language="yaml"
									placeholder="Enter YAML..."
									readOnly={saving || isLoadingTemplateContent}
								/>
							</div>
						</div>
					</div>

					<div class="lg:col-span-1">
						<div class="space-y-4">
							<h3 class="text-lg font-semibold">Environment (.env)</h3>
							<div class="h-[590px] w-full overflow-hidden rounded-md">
								<CodeEditor
									bind:value={envContent}
									language="env"
									placeholder="Enter environment variables..."
									readOnly={saving || isLoadingTemplateContent}
								/>
							</div>
						</div>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>

<TemplateSelectionDialog
	bind:open={showTemplateDialog}
	templates={data.composeTemplates || []}
	onSelect={handleTemplateSelect}
	onDownloadSuccess={invalidateAll}
/>
