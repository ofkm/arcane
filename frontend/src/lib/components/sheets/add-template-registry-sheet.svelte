<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { Loader2, Globe, RefreshCw, CheckCircle, AlertCircle } from '@lucide/svelte';
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
		description: z.string().default(''),
		enabled: z.boolean().default(true)
	});

	let formData = $derived({
		url: '',
		description: '',
		enabled: true
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	// Validation state
	let validationState = $state<{
		isValidating: boolean;
		result: {
			valid: boolean;
			name?: string;
			errors: string[];
			warnings: string[];
		} | null;
	}>({
		isValidating: false,
		result: null
	});

	// Validate registry URL
	async function validateRegistryUrl(url: string) {
		if (!url.trim()) {
			validationState.result = null;
			return;
		}

		validationState.isValidating = true;
		try {
			new URL(url);

			const data = await templateAPI.fetchRegistry(url);

			if (!data.name || !data.templates || !Array.isArray(data.templates)) {
				throw new Error('Invalid registry format: missing required fields (name, templates)');
			}

			validationState.result = {
				valid: true,
				name: data.name,
				errors: [],
				warnings: data.templates.length === 0 ? ['Registry contains no templates'] : []
			};
		} catch (error) {
			validationState.result = {
				valid: false,
				errors: [error instanceof Error ? error.message : 'Invalid registry URL'],
				warnings: []
			};
		} finally {
			validationState.isValidating = false;
		}
	}

	function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		console.log(validationState);
		if (!validationState.result || !validationState.result.valid || !validationState.result.name) {
			return;
		}

		// Include the name from the JSON validation
		const registryData = {
			name: validationState.result.name,
			url: data.url,
			description: data.description ? data.description : undefined,
			enabled: data.enabled
		};

		onSubmit(registryData);
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
	}

	// Watch URL changes for validation with debounce
	$effect(() => {
		if ($inputs.url.value) {
			const timeoutId = setTimeout(() => {
				validateRegistryUrl($inputs.url.value);
			}, 500);

			return () => clearTimeout(timeoutId);
		} else {
			validationState.result = null;
		}
	});
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header class="space-y-3 pb-6 border-b">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
					<Globe class="size-5 text-primary" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">Add Template Registry</Sheet.Title>
					<Sheet.Description class="text-sm text-muted-foreground mt-1">Add a remote template registry to access community templates.</Sheet.Description>
				</div>
			</div>
		</Sheet.Header>
		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="space-y-1">
				<FormInput label="Registry URL *" type="text" placeholder="https://templates.arcane.ofkm.dev/registry.json" description="URL to the registry JSON manifest" bind:input={$inputs.url} />

				{#if validationState.isValidating}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<RefreshCw class="size-3 animate-spin" />
						Validating registry...
					</div>
				{:else if validationState.result}
					{#if validationState.result.valid}
						<div class="flex items-center gap-2 text-sm text-green-600">
							<CheckCircle class="size-3" />
							Valid registry found: <strong>{validationState.result.name}</strong>
						</div>
					{:else}
						<div class="flex items-center gap-2 text-sm text-red-600">
							<AlertCircle class="size-3" />
							{validationState.result.errors[0]}
						</div>
					{/if}
				{/if}
			</div>

			<FormInput label="Description" type="text" placeholder="A collection of useful Docker Compose templates" description="Optional description for this registry" bind:input={$inputs.description} />

			<SwitchWithLabel id="enabledSwitch" label="Enable Registry" description="Enable this registry to fetch templates" bind:checked={$inputs.enabled.value} />

			{#if validationState.result && validationState.result.warnings.length > 0}
				<Alert.Root class="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
					<AlertCircle class="size-4" />
					<Alert.Title>Warnings</Alert.Title>
					<Alert.Description>
						<ul class="list-inside list-disc space-y-1">
							{#each validationState.result.warnings as warning}
								<li class="text-sm">{warning}</li>
							{/each}
						</ul>
					</Alert.Description>
				</Alert.Root>
			{/if}

			<Sheet.Footer class="flex flex-row gap-2">
				<Button type="button" class="arcane-button-cancel flex-1" variant="outline" onclick={() => (open = false)} disabled={isLoading}>Cancel</Button>
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
