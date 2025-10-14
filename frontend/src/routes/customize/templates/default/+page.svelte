<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import { createForm } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { m } from '$lib/paraglide/messages';
	import { templateService } from '$lib/services/template-service';
	import { z } from 'zod/v4';
	import { ResourcePageLayout, type ActionButton } from '$lib/layouts';
	import { goto } from '$app/navigation';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CodeIcon from '@lucide/svelte/icons/code';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

	let { data } = $props();

	let saving = $state(false);
	let originalComposeContent = $state(data.composeTemplate);
	let originalEnvContent = $state(data.envTemplate);

	const formSchema = z.object({
		composeContent: z.string().min(1, m.compose_compose_content_required()),
		envContent: z.string().optional().default('')
	});

	let formData = $derived({
		composeContent: originalComposeContent,
		envContent: originalEnvContent
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	const hasChanges = $derived(
		$inputs.composeContent.value !== originalComposeContent || $inputs.envContent.value !== originalEnvContent
	);

	async function handleSave() {
		const validated = form.validate();
		if (!validated) {
			toast.error(m.templates_validation_error());
			return;
		}

		const { composeContent, envContent } = validated;

		handleApiResultWithCallbacks({
			result: await tryCatch(templateService.saveDefaultTemplates(composeContent, envContent)),
			message: m.templates_save_failed(),
			setLoadingState: (value) => (saving = value),
			onSuccess: async () => {
				toast.success(m.templates_save_success());
				originalComposeContent = $inputs.composeContent.value;
				originalEnvContent = $inputs.envContent.value;
			}
		});
	}

	async function handleReset() {
		$inputs.composeContent.value = originalComposeContent;
		$inputs.envContent.value = originalEnvContent;
		toast.info(m.templates_reset_success());
	}

	const actionButtons = $derived<ActionButton[]>([
		{
			id: 'reset',
			action: 'restart',
			label: m.common_reset(),
			onclick: handleReset,
			disabled: !hasChanges
		},
		{
			id: 'save',
			action: 'save',
			label: m.common_save(),
			loadingLabel: m.common_saving(),
			loading: saving,
			disabled: saving || !hasChanges,
			onclick: handleSave
		}
	]);
</script>

<div class="space-y-4">
	<Button variant="ghost" onclick={() => goto('/customize/templates')} class="w-fit gap-2">
		<ArrowLeftIcon class="size-4" />
		<span>{m.common_back_to({ resource: m.templates_title() })}</span>
	</Button>

	<ResourcePageLayout title={m.templates_defaults_title()} subtitle={m.templates_defaults_description()} {actionButtons}>
		{#snippet mainContent()}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch">
				<Card.Root class="flex min-w-0 flex-col lg:col-span-3">
					<Card.Header icon={CodeIcon} class="flex-shrink-0">
						<div class="flex flex-col space-y-1.5">
							<Card.Title>
								<h2>{m.templates_compose_template_label()}</h2>
							</Card.Title>
							<Card.Description>{m.templates_service_definitions()}</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="min-h-[500px] flex-grow p-0 lg:h-full">
						<div class="h-full rounded-b-xl [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
							<CodeEditor bind:value={$inputs.composeContent.value} language="yaml" />
						</div>
					</Card.Content>
					{#if $inputs.composeContent.error}
						<Card.Footer class="pt-0">
							<p class="text-destructive text-xs">
								{$inputs.composeContent.error}
							</p>
						</Card.Footer>
					{/if}
				</Card.Root>

				<Card.Root class="flex min-w-0 flex-col lg:col-span-2">
					<Card.Header icon={FileTextIcon} class="flex-shrink-0">
						<div class="flex flex-col space-y-1.5">
							<Card.Title>
								<h2>{m.templates_env_template_label()}</h2>
							</Card.Title>
							<Card.Description>{m.templates_default_config_values()}</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="min-h-[500px] flex-grow p-0 lg:h-full">
						<div class="h-full rounded-b-xl [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
							<CodeEditor bind:value={$inputs.envContent.value} language="env" />
						</div>
					</Card.Content>
					{#if $inputs.envContent.error}
						<Card.Footer class="pt-0">
							<p class="text-destructive text-xs">
								{$inputs.envContent.error}
							</p>
						</Card.Footer>
					{/if}
				</Card.Root>
			</div>
		{/snippet}
	</ResourcePageLayout>
</div>
