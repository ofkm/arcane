<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import { createForm } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { m } from '$lib/paraglide/messages';
	import { templateService } from '$lib/services/template-service';
	import { z } from 'zod/v4';
	import { ResourcePageLayout, type ActionButton } from '$lib/layouts/index.js';

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
			toast.error(m.customize_validation_error());
			return;
		}

		const { composeContent, envContent } = validated;

		handleApiResultWithCallbacks({
			result: await tryCatch(templateService.saveDefaultTemplates(composeContent, envContent)),
			message: m.customize_save_failed(),
			setLoadingState: (value) => (saving = value),
			onSuccess: async () => {
				toast.success(m.customize_save_success());
				originalComposeContent = $inputs.composeContent.value;
				originalEnvContent = $inputs.envContent.value;
			}
		});
	}

	async function handleReset() {
		$inputs.composeContent.value = originalComposeContent;
		$inputs.envContent.value = originalEnvContent;
		toast.info(m.customize_reset_success());
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

<ResourcePageLayout title={m.customize_defaults_title()} subtitle={m.customize_defaults_description()} {actionButtons}>
	{#snippet mainContent()}
		<div class="space-y-6">
			<form class="space-y-6">
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div class="lg:col-span-2">
						<div class="space-y-2">
							<Label for="compose" class="text-sm font-medium">
								{m.customize_compose_template_label()}
							</Label>
							<div
								class="border-input focus-within:border-primary focus-within:ring-ring relative rounded-md border bg-transparent transition-colors focus-within:ring-2 focus-within:ring-offset-2"
								class:border-destructive={$inputs.composeContent.error}
							>
								<div class="min-h-[500px] w-full overflow-hidden">
									<CodeEditor bind:value={$inputs.composeContent.value} language="yaml" height="full" />
								</div>
							</div>
							{#if $inputs.composeContent.error}
								<p class="text-destructive text-xs">
									{$inputs.composeContent.error}
								</p>
							{/if}
						</div>
					</div>

					<div class="lg:col-span-1">
						<div class="space-y-2">
							<Label for="env" class="text-sm font-medium">
								{m.customize_env_template_label()}
							</Label>
							<div
								class="border-input focus-within:border-primary focus-within:ring-ring relative rounded-md border bg-transparent transition-colors focus-within:ring-2 focus-within:ring-offset-2"
								class:border-destructive={$inputs.envContent.error}
							>
								<div class="min-h-[500px] w-full overflow-hidden">
									<CodeEditor bind:value={$inputs.envContent.value} language="env" height="full" />
								</div>
							</div>
							{#if $inputs.envContent.error}
								<p class="text-destructive text-xs">
									{$inputs.envContent.error}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</form>
		</div>
	{/snippet}
</ResourcePageLayout>
