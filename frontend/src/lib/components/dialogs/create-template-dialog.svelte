<script lang="ts">
	import { ResponsiveDialog } from '$lib/components/ui/responsive-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Spinner } from '$lib/components/ui/spinner';
	import SaveIcon from '@lucide/svelte/icons/save';
	import CodeIcon from '@lucide/svelte/icons/code';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import { m } from '$lib/paraglide/messages';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';

	let {
		open = $bindable(false),
		onSave,
		isLoading = false,
		initialData = {}
	}: {
		open?: boolean;
		onSave: (data: { name: string; description: string; content: string; envContent: string }) => void | Promise<void>;
		isLoading?: boolean;
		initialData?: {
			name?: string;
			content?: string;
			envContent?: string;
		};
	} = $props();

	const formSchema = z.object({
		name: z.string().min(1, m.compose_project_name_required()),
		description: z.string().optional().default(''),
		content: z.string().min(1, m.compose_compose_content_required()),
		envContent: z.string().optional().default('')
	});

	let formData = $derived({
		name: initialData.name || '',
		description: '',
		content: initialData.content || '',
		envContent: initialData.envContent || ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	async function handleSubmit() {
		const validated = form.validate();
		if (!validated) return;

		await onSave(validated);
	}

	function handleClose() {
		open = false;
	}
</script>

<ResponsiveDialog
	bind:open
	title={m.templates_create_template()}
	description={m.templates_create_template_description()}
	contentClass="sm:max-w-[800px]"
	class="py-4 sm:py-6"
>
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-6 not-md:px-4"
		>
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="template-name" class="text-sm font-semibold">
						{m.common_name()}
						<span class="text-destructive ml-0.5">*</span>
					</Label>
					<Input
						id="template-name"
						bind:value={$inputs.name.value}
						placeholder={m.templates_name_placeholder()}
						disabled={isLoading}
						class={$inputs.name.error ? 'border-destructive' : ''}
					/>
					{#if $inputs.name.error}
						<p class="text-destructive text-xs font-medium">{$inputs.name.error}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="template-description" class="text-sm font-semibold">{m.common_description()}</Label>
					<Textarea
						id="template-description"
						bind:value={$inputs.description.value}
						placeholder={m.templates_description_placeholder()}
						disabled={isLoading}
						rows={2}
						class="resize-none"
					/>
				</div>
			</div>

			<div class="border-border border-t"></div>

			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<div class="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
						<CodeIcon class="text-primary size-4" />
					</div>
					<div class="flex-1">
						<Label for="template-content" class="text-sm font-semibold">
							{m.compose_compose_file_title()}
							<span class="text-destructive ml-0.5">*</span>
						</Label>
						<p class="text-muted-foreground text-xs">{m.templates_service_definitions()}</p>
					</div>
				</div>
				<Textarea
					id="template-content"
					bind:value={$inputs.content.value}
					placeholder={m.compose_compose_placeholder()}
					disabled={isLoading}
					rows={10}
					class={$inputs.content.error
						? 'border-destructive resize-none font-mono text-xs leading-relaxed'
						: 'resize-none font-mono text-xs leading-relaxed'}
				/>
				{#if $inputs.content.error}
					<p class="text-destructive text-xs font-medium">{$inputs.content.error}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<div class="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
						<FileTextIcon class="size-4 text-emerald-500" />
					</div>
					<div class="flex-1">
						<Label for="template-env" class="text-sm font-semibold">{m.compose_env_title()}</Label>
						<p class="text-muted-foreground text-xs">{m.templates_default_config_values()}</p>
					</div>
				</div>
				<Textarea
					id="template-env"
					bind:value={$inputs.envContent.value}
					placeholder={m.compose_env_placeholder()}
					disabled={isLoading}
					rows={6}
					class="resize-none font-mono text-xs leading-relaxed"
				/>
			</div>
		</form>
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose} disabled={isLoading} class="flex-1 sm:flex-none">
			{m.common_cancel()}
		</Button>
		<Button
			onclick={handleSubmit}
			disabled={isLoading || !$inputs.name.value || !$inputs.content.value}
			class="flex-1 sm:flex-none"
		>
			{#if isLoading}
				<Spinner class="mr-2 size-4" />
				{m.common_action_saving()}
			{:else}
				<SaveIcon class="mr-2 size-4" />
				{m.templates_create_template()}
			{/if}
		</Button>
	{/snippet}
</ResponsiveDialog>
