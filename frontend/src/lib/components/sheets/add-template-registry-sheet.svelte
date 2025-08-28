<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { Loader2, Globe, AlertCircle } from '@lucide/svelte';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { templateAPI } from '$lib/services/api';
	import * as Alert from '$lib/components/ui/alert/index.js';

	type TemplateRegistryFormProps = {
		open: boolean;
		onSubmit: (registry: { name: string; url: string; description?: string; enabled: boolean }) => void;
		isLoading: boolean;
	};

	let { open = $bindable(false), onSubmit, isLoading }: TemplateRegistryFormProps = $props();

	const formSchema = z.object({
		url: z.url().min(1, 'Registry URL is required'),
		enabled: z.boolean().default(true)
	});

	let formData = $derived({
		url: '',
		enabled: true
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	let submitError = $state<string | null>(null);

	async function handleSubmit() {
		submitError = null;

		const data = form.validate();
		if (!data) return;

		try {
			const registryData = await templateAPI.fetchRegistry(data.url);

			if (!registryData.name || !registryData.templates || !Array.isArray(registryData.templates)) {
				throw new Error('Invalid registry format: missing required fields (name, templates)');
			}

			const registryPayload = {
				name: registryData.name,
				url: data.url,
				enabled: data.enabled
			};

			onSubmit(registryPayload);
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to validate registry URL';
		}
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			submitError = null;
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header class="space-y-3 border-b pb-6">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
					<Globe class="text-primary size-5" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">Add Template Registry</Sheet.Title>
					<Sheet.Description class="text-muted-foreground mt-1 text-sm"
						>Add a remote template registry to access community templates.</Sheet.Description
					>
				</div>
			</div>
		</Sheet.Header>
		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<FormInput
				label="Registry URL *"
				type="text"
				placeholder="https://templates.arcane.ofkm.dev/registry.json"
				description="URL to the registry JSON manifest"
				bind:input={$inputs.url}
			/>

			<SwitchWithLabel
				id="enabledSwitch"
				label="Enable Registry"
				description="Enable this registry to fetch templates"
				bind:checked={$inputs.enabled.value}
			/>

			{#if submitError}
				<Alert.Root class="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
					<AlertCircle class="size-4" />
					<Alert.Title>Validation Error</Alert.Title>
					<Alert.Description class="text-sm">{submitError}</Alert.Description>
				</Alert.Root>
			{/if}

			<Sheet.Footer class="flex flex-row gap-2">
				<Button
					type="button"
					class="arcane-button-cancel flex-1"
					variant="outline"
					onclick={() => (open = false)}
					disabled={isLoading}
				>
					Cancel
				</Button>
				<Button type="submit" class="arcane-button-create flex-1" disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{/if}
					Add Registry
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
