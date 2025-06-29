<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { Loader2, PackagePlusIcon } from '@lucide/svelte';
	import type { ContainerRegistry } from '$lib/models/container-registry';
	import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/dto/container-registry-dto';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';

	type ContainerRegistryFormProps = {
		open: boolean;
		registryToEdit: ContainerRegistry | null;
		onSubmit: (detail: { registry: ContainerRegistryCreateDto | ContainerRegistryUpdateDto; isEditMode: boolean }) => void;
		isLoading: boolean;
	};

	let { open = $bindable(false), registryToEdit = $bindable(), onSubmit, isLoading }: ContainerRegistryFormProps = $props();

	let isEditMode = $derived(!!registryToEdit);

	const formSchema = z.object({
		url: z.string().min(1, 'Registry URL is required'),
		username: z.string().min(1, 'Username is required'),
		token: z.string().optional(),
		description: z.string().optional(),
		insecure: z.boolean().default(false),
		enabled: z.boolean().default(true)
	});

	let formData = $derived({
		url: registryToEdit?.url || '',
		username: registryToEdit?.username || '',
		token: '',
		description: registryToEdit?.description || '',
		insecure: registryToEdit?.insecure ?? false,
		enabled: registryToEdit?.enabled ?? true
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		onSubmit({ registry: data, isEditMode });
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			registryToEdit = null;
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header class="space-y-3 pb-6 border-b">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
					<PackagePlusIcon class="size-5 text-primary" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">
						{isEditMode ? 'Edit' : 'Add'} Container Registry
					</Sheet.Title>
					<Sheet.Description class="text-sm text-muted-foreground mt-1">
						{isEditMode ? 'Update the details for this container registry.' : 'Enter the details for the new container registry.'}
					</Sheet.Description>
				</div>
			</div>
		</Sheet.Header>
		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<FormInput label="Registry URL *" type="text" placeholder="e.g., docker.io, ghcr.io, gcr.io, quay.io" description="Leave empty or use 'docker.io' for Docker Hub" bind:input={$inputs.url} />
			<FormInput label="Username *" type="text" description="Your registry username" bind:input={$inputs.username} />
			<FormInput label="Token *" type="password" placeholder={isEditMode ? 'Leave empty to keep current token' : 'Your registry password or token'} description="Use a Personal Access Token or your password if the registry supports it. " bind:input={$inputs.token} />
			<FormInput label="Description" type="text" placeholder="Optional description for this registry" bind:input={$inputs.description} />
			<SwitchWithLabel id="isEnabledSwitch" label="Enabled" description="Enable this registry for authentication" bind:checked={$inputs.enabled.value} />
			<SwitchWithLabel id="insecureSwitch" label="Allow Insecure Connection" description="Allow HTTP connections" bind:checked={$inputs.insecure.value} />

			<Sheet.Footer class="flex flex-row gap-2">
				<Button type="button" class="arcane-button-cancel flex-1" variant="outline" onclick={() => (open = false)} disabled={isLoading}>Cancel</Button>
				<Button type="submit" class="arcane-button-create flex-1" disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{/if}
					{isEditMode ? 'Save Changes' : 'Add Registry'}
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
