<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Loader2 } from '@lucide/svelte';
	import type { RegistryCredential } from '$lib/types/settings.type';
	import { preventDefault } from '$lib/utils/form.utils';

	type RegistryFormDialogProps = {
		open: boolean;
		credentialToEdit: (RegistryCredential & { originalIndex?: number }) | null;
		onSubmit: (detail: { credential: RegistryCredential; isEditMode: boolean; originalIndex?: number }) => void;
		isLoading: boolean;
	};

	let { open = $bindable(false), credentialToEdit = $bindable(), onSubmit, isLoading }: RegistryFormDialogProps = $props();

	let internalCredential = $state<RegistryCredential>({ url: '', username: '', password: '' });
	let isEditMode = $state(false);
	let originalIndex = $state<number | undefined>(undefined);

	$effect(() => {
		if (credentialToEdit) {
			internalCredential = { ...credentialToEdit };
			isEditMode = true;
			originalIndex = credentialToEdit.originalIndex;
		} else {
			internalCredential = { url: '', username: '', password: '' };
			isEditMode = false;
			originalIndex = undefined;
		}
	});

	function handleSubmit() {
		if (isLoading) return;
		onSubmit({ credential: { ...internalCredential }, isEditMode, originalIndex });
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			credentialToEdit = null;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{isEditMode ? 'Edit' : 'Add'} Docker Registry</Dialog.Title>
			<Dialog.Description>
				{isEditMode ? 'Update the details for this Docker registry.' : 'Enter the details for the new Docker registry.'}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="grid grid-cols-3 items-center gap-4">
				<Label for="registry-url" class="text-right">Registry URL</Label>
				<Input id="registry-url" bind:value={internalCredential.url} class="col-span-2" placeholder="e.g., docker.io, ghcr.io" required />
			</div>
			<div class="grid grid-cols-3 items-center gap-4">
				<Label for="registry-username" class="text-right">Username</Label>
				<Input id="registry-username" bind:value={internalCredential.username} class="col-span-2" placeholder="Your registry username" />
			</div>
			<div class="grid grid-cols-3 items-center gap-4">
				<Label for="registry-password" class="text-right">Password/Token</Label>
				<Input type="password" id="registry-password" bind:value={internalCredential.password} class="col-span-2" placeholder="Your registry password or token" />
			</div>
			<p class="text-xs text-muted-foreground col-span-full text-center px-4">For Docker Hub, if URL is empty or 'docker.io', it defaults to Docker Hub. For others like GHCR, provide the full URL.</p>
			<Dialog.Footer>
				<Button type="button" class="arcane-button-cancel" variant="outline" onclick={() => (open = false)} disabled={isLoading}>Cancel</Button>
				<Button type="submit" class="arcane-button-create" disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="mr-2 animate-spin size-4" />
					{/if}
					{isEditMode ? 'Save Changes' : 'Add Registry'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
