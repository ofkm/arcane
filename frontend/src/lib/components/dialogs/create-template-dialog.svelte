<script lang="ts">
	import { ResponsiveDialog } from '$lib/components/ui/responsive-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Spinner } from '$lib/components/ui/spinner';
	import SaveIcon from '@lucide/svelte/icons/save';
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
	contentClass="sm:max-w-[600px]"
>
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="template-name">{m.common_name()}</Label>
				<Input
					id="template-name"
					bind:value={$inputs.name.value}
					placeholder={m.templates_name_placeholder()}
					disabled={isLoading}
					class={$inputs.name.error ? 'border-destructive' : ''}
				/>
				{#if $inputs.name.error}
					<p class="text-destructive text-sm">{$inputs.name.error}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="template-description">{m.common_description()}</Label>
				<Textarea
					id="template-description"
					bind:value={$inputs.description.value}
					placeholder={m.templates_description_placeholder()}
					disabled={isLoading}
					rows={2}
				/>
			</div>

			<div class="space-y-2">
				<Label for="template-content">{m.compose_compose_file_title()}</Label>
				<Textarea
					id="template-content"
					bind:value={$inputs.content.value}
					placeholder={m.compose_compose_placeholder()}
					disabled={isLoading}
					rows={8}
					class={$inputs.content.error ? 'border-destructive font-mono text-sm' : 'font-mono text-sm'}
				/>
				{#if $inputs.content.error}
					<p class="text-destructive text-sm">{$inputs.content.error}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="template-env">{m.compose_env_title()}</Label>
				<Textarea
					id="template-env"
					bind:value={$inputs.envContent.value}
					placeholder={m.compose_env_placeholder()}
					disabled={isLoading}
					rows={4}
					class="font-mono text-sm"
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
