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
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	let saving = $state(false);
	let converting = $state(false);
	let showTemplateDialog = $state(false);
	let showConverterDialog = $state(false);
	let isLoadingTemplateContent = $state(false);

	const formSchema = z.object({
		name: z
			.string()
			.min(1, m.compose_project_name_required())
			.regex(/^[a-z0-9-_]+$/i, m.compose_project_name_invalid()),
		composeContent: z.string().min(1, m.compose_compose_content_required()),
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
			result: await tryCatch(environmentAPI.createProject(name, composeContent, envContent)),
			message: m.compose_create_failed(),
			setLoadingState: (value) => (saving = value),
			onSuccess: async (project) => {
				toast.success(m.compose_create_success({ name }));
				goto(`/compose/${project.id}`, { invalidateAll: true });
			}
		});
	}

	async function handleConvertDockerRun() {
		if (!dockerRunCommand.trim()) {
			toast.error(m.compose_enter_docker_run_command());
			return;
		}

		handleApiResultWithCallbacks({
			result: await tryCatch(converterAPI.convert(dockerRunCommand)),
			message: m.compose_convert_failed(),
			setLoadingState: (value) => (converting = value),
			onSuccess: (data) => {
				$inputs.composeContent.value = data.dockerCompose;
				$inputs.envContent.value = data.envVars;
				$inputs.name.value = data.serviceName;

				toast.success(m.compose_convert_success());
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
			$inputs.name.value = template.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
		}
		toast.success(m.compose_template_loaded({ name: template.name }));
	}

	const exampleCommands = [m.compose_example_command_1(), m.compose_example_command_2(), m.compose_example_command_3()];

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
	<div class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 border-b backdrop-blur">
		<div class="max-w-full px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button variant="ghost" size="sm" href="/compose" class="gap-2">
						<ArrowLeftIcon class="size-4" />
						{m.common_back()}
					</Button>
					<div class="bg-border h-4 w-px"></div>
					<div class="flex items-center gap-2">
						<h1 class="text-lg font-semibold leading-none">{m.compose_new_title()}</h1>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<Dialog.Root bind:open={showConverterDialog}>
						<Dialog.Content class="max-h-[80vh] sm:max-w-[800px]">
							<Dialog.Header>
								<Dialog.Title>{m.compose_converter_title()}</Dialog.Title>
								<Dialog.Description>{m.compose_converter_description()}</Dialog.Description>
							</Dialog.Header>

							<div class="max-h-[60vh] space-y-4 overflow-y-auto">
								<div class="space-y-2">
									<Label for="dockerRunCommand">{m.compose_docker_run_command_label()}</Label>
									<Textarea
										id="dockerRunCommand"
										bind:value={dockerRunCommand}
										placeholder={m.compose_docker_run_placeholder()}
										rows={3}
										disabled={converting}
										class="font-mono text-sm"
									/>
								</div>

								<div class="space-y-2">
									<Label class="text-muted-foreground text-xs">{m.compose_example_commands_label()}</Label>
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
										{m.compose_converting()}
									{:else}
										<WandIcon class="mr-2 size-4" />
										{m.compose_convert_action()}
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
									{m.compose_creating()}
								{:else}
									<PlusCircleIcon class="size-4" />
									{m.compose_create_project()}
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
								{m.compose_use_template()}
							</DropdownButton.Item>
							<DropdownButton.Item class={dropdownItemClass} onclick={() => (showConverterDialog = true)}>
								<TerminalIcon class="size-4" />
								{m.compose_convert_from_docker_run()}
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
					<Label for="name" class="text-sm font-medium">{m.compose_name_label?.() ?? m.common_name()}</Label>
					<div class="max-w-md">
						<Input
							type="text"
							id="name"
							name="name"
							bind:value={$inputs.name.value}
							required
							placeholder={m.compose_name_placeholder()}
							disabled={saving || isLoadingTemplateContent}
							class={$inputs.name.error ? 'border-destructive' : ''}
						/>
						{#if $inputs.name.error}
							<p class="text-destructive mt-1 text-xs">{$inputs.name.error}</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">{m.compose_name_hint()}</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<!-- Compose -->
					<div class="lg:col-span-2">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-semibold">{m.compose_compose_file_title()}</h3>
								<span class="text-muted-foreground text-xs">{m.compose_yaml_label()}</span>
							</div>
							<div class="h-[590px] w-full">
								<CodeEditor
									bind:value={$inputs.composeContent.value}
									language="yaml"
									placeholder={m.compose_compose_placeholder()}
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
								<h3 class="text-lg font-semibold">{m.compose_env_title()}</h3>
								<span class="text-muted-foreground text-xs">{m.compose_env_kv_label()}</span>
							</div>
							<div class="h-[590px] w-full">
								<CodeEditor
									bind:value={$inputs.envContent.value}
									language="env"
									placeholder={m.compose_env_placeholder()}
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
