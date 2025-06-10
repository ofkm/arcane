<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Loader2 } from '@lucide/svelte';
	import type { ContainerRegistry } from '$lib/models/container-registry';
	import type {
		ContainerRegistryCreateDto,
		ContainerRegistryUpdateDto
	} from '$lib/dto/container-registry-dto';
	import { preventDefault } from '$lib/utils/form.utils';

	type ContainerRegistryFormDialogProps = {
		open: boolean;
		registryToEdit: ContainerRegistry | null;
		onSubmit: (detail: {
			registry: ContainerRegistryCreateDto | ContainerRegistryUpdateDto;
			isEditMode: boolean;
		}) => void;
		isLoading: boolean;
	};

	let {
		open = $bindable(false),
		registryToEdit = $bindable(),
		onSubmit,
		isLoading
	}: ContainerRegistryFormDialogProps = $props();

	let internalRegistry = $state<ContainerRegistry>({
		url: '',
		username: '',
		token: '',
		description: '',
		insecure: false,
		enabled: true
	});
	let isEditMode = $state(false);

	$effect(() => {
		if (registryToEdit) {
			internalRegistry = {
				...registryToEdit,
				token: '' // Don't pre-fill token for security
			};
			isEditMode = true;
		} else {
			internalRegistry = {
				url: '',
				username: '',
				token: '',
				description: '',
				insecure: false,
				enabled: true
			};
			isEditMode = false;
		}
	});

	function handleSubmit() {
		if (isLoading) return;

		const registryData = {
			url: internalRegistry.url,
			username: internalRegistry.username,
			token: internalRegistry.token,
			description: internalRegistry.description,
			insecure: internalRegistry.insecure,
			enabled: internalRegistry.enabled
		};

		// Call the onSubmit function directly with the detail
		onSubmit({ registry: registryData, isEditMode });
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			registryToEdit = null;
		}
	}

	// Form validation
	let isFormValid = $derived(
		internalRegistry.url.trim() !== '' &&
			internalRegistry.username.trim() !== '' &&
			(isEditMode || internalRegistry.token?.trim() !== '')
	);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>{isEditMode ? 'Edit' : 'Add'} Container Registry</Dialog.Title>
			<Dialog.Description>
				{isEditMode
					? 'Update the details for this container registry.'
					: 'Enter the details for the new container registry.'}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="registry-url">Registry URL *</Label>
				<Input
					id="registry-url"
					bind:value={internalRegistry.url}
					placeholder="e.g., docker.io, ghcr.io, gcr.io, quay.io"
					required
				/>
				<p class="text-muted-foreground text-xs">Leave empty or use 'docker.io' for Docker Hub</p>
			</div>

			<div class="grid gap-2">
				<Label for="registry-username">Username *</Label>
				<Input
					id="registry-username"
					bind:value={internalRegistry.username}
					placeholder="Your registry username"
					required
				/>
			</div>

			<div class="grid gap-2">
				<Label for="registry-token">Password/Token *</Label>
				<Input
					type="password"
					id="registry-token"
					bind:value={internalRegistry.token}
					placeholder={isEditMode
						? 'Leave empty to keep current token'
						: 'Your registry password or token'}
					required={!isEditMode}
				/>
				<p class="text-muted-foreground text-xs">
					For GitHub, use a Personal Access Token. For Docker Hub, use your password.
				</p>
			</div>

			<div class="grid gap-2">
				<Label for="registry-description">Description</Label>
				<Textarea
					id="registry-description"
					bind:value={internalRegistry.description}
					placeholder="Optional description for this registry"
					rows={2}
				/>
			</div>

			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="space-y-0.5">
					<Label for="registry-enabled" class="text-base">Enabled</Label>
					<p class="text-muted-foreground text-sm">Enable this registry for authentication</p>
				</div>
				<Switch id="registry-enabled" bind:checked={internalRegistry.enabled} />
			</div>

			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="space-y-0.5">
					<Label for="registry-insecure" class="text-base">Allow Insecure Connection</Label>
					<p class="text-muted-foreground text-sm">
						Allow HTTP connections (not recommended for production)
					</p>
				</div>
				<Switch id="registry-insecure" bind:checked={internalRegistry.insecure} />
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					class="arcane-button-cancel"
					variant="outline"
					onclick={() => (open = false)}
					disabled={isLoading}
				>
					Cancel
				</Button>
				<Button type="submit" class="arcane-button-create" disabled={isLoading || !isFormValid}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{/if}
					{isEditMode ? 'Save Changes' : 'Add Registry'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
