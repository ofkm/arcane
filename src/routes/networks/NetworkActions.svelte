<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, Loader2 } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';

	interface Props {
		id: string | undefined;
		name: string;
	}

	let { id, name }: Props = $props();

	let isConfirmDeleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	// Add a derived state to check if the network is a default one
	const isDefaultNetwork = $derived(name === 'host' || name === 'bridge' || name === 'none');

	function openConfirmDialog() {
		if (!id) return; // Should not happen if button is rendered
		isConfirmDeleteDialogOpen = true;
	}

	async function handleConfirmDelete() {
		if (!id) return;
		isDeleting = true;

		try {
			const response = await fetch(`/api/networks/${encodeURIComponent(id)}`, {
				method: 'DELETE'
			});
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || `HTTP error! status: ${response.status}`);
			}

			toast.success(`Network "${name}" deleted successfully.`);
			isConfirmDeleteDialogOpen = false; // Close dialog
			await invalidateAll(); // Refresh the list on the parent page
		} catch (err) {
			console.error(`Failed to delete network ${id}:`, err);
			const message = err instanceof Error ? err.message : String(err); // Get message safely
			toast.error(`Failed to delete network "${name}": ${message}`);
			// Keep dialog open on error? Optional.
			// isConfirmDeleteDialogOpen = false;
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if id}
	<!-- Delete Button -->
	<Button variant="ghost" size="icon" class={cn('size-8', !isDefaultNetwork && 'text-destructive hover:text-destructive hover:bg-destructive/10')} onclick={openConfirmDialog} title={isDefaultNetwork ? 'Cannot delete default network' : 'Delete Network'} disabled={isDeleting || isDefaultNetwork}>
		<Trash2 class="w-4 h-4" />
	</Button>

	<!-- Confirmation Dialog -->
	<Dialog.Root bind:open={isConfirmDeleteDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete Network "{name}"</Dialog.Title>
				<Dialog.Description>Are you sure you want to delete this network? This action cannot be undone. Networks currently in use by containers cannot be deleted.</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-end gap-3 pt-6">
				<Button variant="outline" onclick={() => (isConfirmDeleteDialogOpen = false)} disabled={isDeleting}>Cancel</Button>
				<Button variant="destructive" onclick={handleConfirmDelete} disabled={isDeleting}>
					{#if isDeleting}
						<Loader2 class="w-4 h-4 mr-2 animate-spin" /> Deleting...
					{:else}
						Delete Network
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Add other actions like inspect if needed -->
