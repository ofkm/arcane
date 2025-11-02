<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import { createForm } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { m } from '$lib/paraglide/messages';
	import { templateService } from '$lib/services/template-service';
	import { z } from 'zod/v4';
	import { goto } from '$app/navigation';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CodeIcon from '@lucide/svelte/icons/code';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import SaveIcon from '@lucide/svelte/icons/save';
	import TemplateSelectionDialog from '$lib/components/dialogs/template-selection-dialog.svelte';
	import type { Template } from '$lib/types/template.type';
	import { page } from '$app/stores';

	let { data } = $props();

	let saving = $state(false);
	let showTemplateDialog = $state(false);
	let isLoadingTemplate = $state(false);

	// Get URL parameters for prefilling
	const urlParams = $derived($page.url.searchParams);
	const returnTo = $derived(urlParams.get('returnTo'));

	const formSchema = z.object({
		name: z.string().min(1, m.compose_project_name_required()),
		description: z.string().optional().default(''),
		content: z.string().min(1, m.compose_compose_content_required()),
		envContent: z.string().optional().default('')
	});

	let formData = $derived({
		name: urlParams.get('name') || '',
		description: urlParams.get('description') || '',
		content: urlParams.get('content') || '',
		envContent: urlParams.get('envContent') || ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	async function handleSave() {
		const validated = form.validate();
		if (!validated) {
			toast.error(m.templates_validation_error());
			return;
		}

		handleApiResultWithCallbacks({
			result: await tryCatch(templateService.createTemplate(validated)),
			message: m.common_create_failed({ resource: m.resource_template() }),
			setLoadingState: (value) => (saving = value),
			onSuccess: async (template) => {
				toast.success(m.common_create_success({ resource: `${m.resource_template()} "${validated.name}"` }));
				// If returnTo is set, navigate back to that page
				if (returnTo) {
					await goto(returnTo);
				} else if (template?.id) {
					await goto(`/customize/templates/${template.id}`);
				} else {
					await goto('/customize/templates');
				}
			}
		});
	}

	function handleBack() {
		if (returnTo) {
			goto(returnTo);
		} else {
			goto('/customize/templates');
		}
	}

	async function handleTemplateSelect(template: Template) {
		showTemplateDialog = false;
		isLoadingTemplate = true;

		try {
			const templateContent = await templateService.getTemplateContent(template.id);
			$inputs.content.value = templateContent.content ?? template.content ?? '';
			$inputs.envContent.value = templateContent.envContent ?? template.envContent ?? '';
			if (!$inputs.name.value) {
				$inputs.name.value = template.name;
			}
			if (!$inputs.description.value) {
				$inputs.description.value = template.description;
			}
			toast.success(m.compose_template_loaded({ name: template.name }));
		} catch (error) {
			console.error('Error loading template:', error);
			toast.error(error instanceof Error ? error.message : m.templates_download_failed());
		} finally {
			isLoadingTemplate = false;
		}
	}
</script>

<div class="container mx-auto max-w-full space-y-6 overflow-hidden p-2 sm:p-6">
	<div class="space-y-3 sm:space-y-4">
		<Button variant="ghost" onclick={handleBack} class="w-fit gap-2">
			<ArrowLeftIcon class="size-4" />
			<span>{returnTo ? m.common_back() : m.common_back_to({ resource: m.templates_title() })}</span>
		</Button>

		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-xl font-bold wrap-break-word sm:text-2xl">{m.templates_create_template()}</h1>
				<p class="text-muted-foreground mt-1.5 text-sm wrap-break-word sm:text-base">
					{m.templates_create_template_description()}
				</p>
			</div>
			<div class="flex flex-col gap-2 sm:flex-row">
				<Button variant="outline" onclick={() => (showTemplateDialog = true)} disabled={saving || isLoadingTemplate}>
					{m.common_use_template()}
				</Button>
				<Button onclick={handleSave} disabled={saving || isLoadingTemplate} class="gap-2">
					<SaveIcon class="size-4" />
					{saving ? m.common_action_saving() : m.common_save()}
				</Button>
			</div>
		</div>
	</div>

	<div class="space-y-6">
		<Card.Root>
			<Card.Content class="space-y-4 p-6">
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="template-name" class="text-sm font-semibold">
							{m.common_name()}
							<span class="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="template-name"
							bind:value={$inputs.name.value}
							placeholder={m.templates_name_placeholder()}
							disabled={saving || isLoadingTemplate}
							class={$inputs.name.error ? 'border-destructive' : ''}
						/>
						{#if $inputs.name.error}
							<p class="text-destructive text-xs font-medium">{$inputs.name.error}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="template-description" class="text-sm font-semibold">{m.common_description()}</Label>
						<Input
							id="template-description"
							bind:value={$inputs.description.value}
							placeholder={m.templates_description_placeholder()}
							disabled={saving || isLoadingTemplate}
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch">
			<Card.Root class="flex min-w-0 flex-col lg:col-span-3">
				<Card.Header icon={CodeIcon} class="shrink-0">
					<div class="flex flex-col space-y-1.5">
						<Card.Title>
							<h2>{m.compose_compose_file_title()}</h2>
							<span class="text-destructive ml-0.5">*</span>
						</Card.Title>
						<Card.Description>{m.templates_service_definitions()}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content class="min-h-[500px] grow p-0 lg:h-full">
					<div class="h-full rounded-b-xl [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
						<CodeEditor bind:value={$inputs.content.value} language="yaml" readOnly={saving || isLoadingTemplate} />
					</div>
				</Card.Content>
				{#if $inputs.content.error}
					<Card.Footer class="pt-0">
						<p class="text-destructive text-xs font-medium">
							{$inputs.content.error}
						</p>
					</Card.Footer>
				{/if}
			</Card.Root>

			<Card.Root class="flex min-w-0 flex-col lg:col-span-2">
				<Card.Header icon={FileTextIcon} class="shrink-0">
					<div class="flex flex-col space-y-1.5">
						<Card.Title>
							<h2>{m.compose_env_title()}</h2>
						</Card.Title>
						<Card.Description>{m.templates_default_config_values()}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content class="min-h-[500px] grow p-0 lg:h-full">
					<div class="h-full rounded-b-xl [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
						<CodeEditor bind:value={$inputs.envContent.value} language="env" readOnly={saving || isLoadingTemplate} />
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<TemplateSelectionDialog bind:open={showTemplateDialog} templates={data.templates || []} onSelect={handleTemplateSelect} />
