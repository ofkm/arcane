<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import LayoutTemplateIcon from '@lucide/svelte/icons/layout-template';
	import WandIcon from '@lucide/svelte/icons/wand';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import { preventDefault, createForm } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { defaultComposeTemplate } from '$lib/constants';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import TemplateSelectionDialog from '$lib/components/dialogs/template-selection-dialog.svelte';
	import { environmentAPI, converterAPI } from '$lib/services/api';
	import type { Template } from '$lib/types/template.type';
	import * as DropdownButton from '$lib/components/ui/dropdown-button/index.js';
	import { z } from 'zod/v4';
	import { arcaneButtonVariants, actionConfigs } from '$lib/components/arcane-button/variants';
	import PlusCircleIcon from '@lucide/svelte/icons/plus-circle';

	let { data } = $props();

	let saving = $state(false);
	let converting = $state(false);
	let showTemplateDialog = $state(false);
	let showConverterDialog = $state(false);
	let isLoadingTemplateContent = $state(false);

	const formSchema = z.object({
		name: z
			.string()
			.min(1, 'Project name is required')
			.regex(/^[a-z0-9-]+$/i, 'Only letters, numbers, and hyphens are allowed'),
		composeContent: z.string().min(1, 'Compose content is required'),
		envContent: z.string().optional().default('')
	});

	let formData = $derived({
		name: '',
		composeContent: data.defaultTemplate || defaultComposeTemplate,
		envContent: data.envTemplate || ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	let dockerRunCommand = $state('');

	async function handleSubmit() {
		await handleCreateProject();
	}

	async function handleCreateProject() {
		const validated = form.validate();
		if (!validated) return;

		const { name, composeContent, envContent } = validated;

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
				$inputs.composeContent.value = data.dockerCompose;
				$inputs.envContent.value = data.envVars;
				$inputs.name.value = data.serviceName;

				toast.success('Docker run command converted successfully!');
				dockerRunCommand = '';
				showConverterDialog = false;
			}
		});
	}

	async function handleTemplateSelect(template: Template) {
		showTemplateDialog = false;

		$inputs.composeContent.value = template.content;
		if (template.envContent) {
			$inputs.envContent.value = template.envContent;
		}

		if (!$inputs.name.value?.trim()) {
			$inputs.name.value = template.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
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

	const templateBtnClass = arcaneButtonVariants({
		tone: actionConfigs.template?.tone ?? 'outline-primary',
		size: 'default'
	});

	const dropdownContentClass =
		'arcane-dd-content min-w-[220px] overflow-visible rounded-lg border border-primary/30 bg-background/95 ' +
		'backdrop-blur supports-[backdrop-filter]:bg-background/80 ring-1 ring-inset ring-primary/20 shadow-sm p-1';

	const dropdownItemClass =
		'flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm ' +
		'text-foreground/90 outline-none transition-colors ' +
		'hover:bg-primary/10 focus:bg-primary/10 ' +
		'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none';
</script>

<div class="bg-background min-h-screen">
	<!-- Sticky header: softer glass effect without changing spacing -->
	<div class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 border-b backdrop-blur">
		<div class="max-w-full px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button variant="ghost" size="sm" href="/compose" class="gap-2">
						<ArrowLeftIcon class="size-4" />
						Back
					</Button>
					<div class="bg-border h-4 w-px"></div>
					<div class="flex items-center gap-2">
						<h1 class="text-lg font-semibold leading-none">Create New Project</h1>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<Dialog.Root bind:open={showConverterDialog}>
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
												<span class=""> {command} </span>
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

					<DropdownButton.DropdownRoot>
						<DropdownButton.Root align="center" class="inline-flex">
							<DropdownButton.Main
								disabled={!$inputs.name.value ||
									!$inputs.composeContent.value ||
									saving ||
									converting ||
									isLoadingTemplateContent}
								onclick={() => handleSubmit()}
								class={`${templateBtnClass} gap-2 rounded-r-none hover:!translate-y-0 focus-visible:!translate-y-0 active:!translate-y-0`}
							>
								{#if saving}
									<LoaderCircleIcon class="size-4 animate-spin" />
									Creating...
								{:else}
									<PlusCircleIcon class="size-4" />
									Create Project
								{/if}
							</DropdownButton.Main>

							<DropdownButton.DropdownTrigger>
								{#snippet child({ props })}
									<DropdownButton.Trigger
										{...props}
										class={[
											props.class,
											templateBtnClass,
											'-ml-px rounded-l-none px-2',
											'hover:!translate-y-0 focus-visible:!translate-y-0 active:!translate-y-0'
										].join(' ')}
									/>
								{/snippet}
							</DropdownButton.DropdownTrigger>
						</DropdownButton.Root>

						<DropdownButton.Content class={dropdownContentClass}>
							<DropdownButton.Item
								class={dropdownItemClass}
								disabled={saving || converting || isLoadingTemplateContent}
								onclick={() => (showTemplateDialog = true)}
							>
								<LayoutTemplateIcon class="size-4" />
								Use Template
							</DropdownButton.Item>
							<DropdownButton.Item class={dropdownItemClass} onclick={() => (showConverterDialog = true)}>
								<TerminalIcon class="size-4" />
								Convert from Docker Run
							</DropdownButton.Item>
						</DropdownButton.Content>
					</DropdownButton.DropdownRoot>
				</div>
			</div>
		</div>
	</div>

	<!-- Keep existing page padding -->
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
							bind:value={$inputs.name.value}
							required
							placeholder="e.g., my-web-app"
							disabled={saving || isLoadingTemplateContent}
							class={$inputs.name.error ? 'border-destructive' : ''}
						/>
						{#if $inputs.name.error}
							<p class="text-destructive mt-1 text-xs">{$inputs.name.error}</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">Use letters, numbers, and hyphens only.</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<!-- Compose -->
					<div class="lg:col-span-2">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-semibold">Docker Compose File</h3>
								<span class="text-muted-foreground text-xs">YAML</span>
							</div>
							<div class="h-[590px] w-full">
								<CodeEditor
									bind:value={$inputs.composeContent.value}
									language="yaml"
									placeholder="Enter YAML..."
									readOnly={saving || isLoadingTemplateContent}
								/>
							</div>
							{#if $inputs.composeContent.error}
								<p class="text-destructive mt-1 text-xs">{$inputs.composeContent.error}</p>
							{/if}
						</div>
					</div>

					<!-- Env -->
					<div class="lg:col-span-1">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-semibold">Environment (.env)</h3>
								<span class="text-muted-foreground text-xs">Key=Value</span>
							</div>
							<div class="h-[590px] w-full">
								<CodeEditor
									bind:value={$inputs.envContent.value}
									language="env"
									placeholder="Enter environment variables..."
									readOnly={saving || isLoadingTemplateContent}
								/>
							</div>
							{#if $inputs.envContent.error}
								<p class="text-destructive mt-1 text-xs">{$inputs.envContent.error}</p>
							{/if}
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

<style>
	:global(.arcane-dd-content [data-arrow]) {
		background: color-mix(in srgb, var(--background), transparent 5%);
		border: 1px solid color-mix(in srgb, var(--primary), transparent 70%);
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.12);
		z-index: 10;
	}
</style>
