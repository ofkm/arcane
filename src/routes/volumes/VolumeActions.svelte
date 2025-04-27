<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Trash2, Loader2, Ellipsis, ScanSearch } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';

	const { name, inUse = false } = $props<{ name: string; inUse: boolean }>();

	let showRemoveConfirm = $state(false);
	let isDeleting = $state(false);

	function viewVolume() {
		goto(`/volumes/${encodeURIComponent(name)}`);
	}

	function triggerRemove() {
		showRemoveConfirm = true;
	}

	async function handleRemoveConfirm(force?: boolean) {
		showRemoveConfirm = false;
		isDeleting = true;
		try {
			const endpoint = `/api/volumes/${encodeURIComponent(name)}${force ? '?force=true' : ''}`;
			const response = await fetch(endpoint, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || `HTTP error! status: ${response.status}`);
			}

			toast.success(`Volume "${name}" deleted successfully.`);
			await invalidateAll();
		} catch (err: any) {
			console.error(`Failed to delete volume "${name}":`, err);
			toast.error(`Failed to delete volume: ${err.message}`);
		} finally {
			isDeleting = false;
		}
	}

	const isAnyLoading = $derived(isDeleting);
	const removeDescription = $derived(`Are you sure you want to delete volume "${name}"? This action cannot be undone.`);
</script>

<ConfirmDialog bind:open={showRemoveConfirm} itemType={'volume'} isRunning={inUse} title="Confirm Volume Removal" description={removeDescription} confirmLabel="Delete" variant="destructive" onConfirm={handleRemoveConfirm} />

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
				<span class="sr-only">Open menu</span>
				<Ellipsis />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Group>
			<DropdownMenu.Item onclick={viewVolume} disabled={isAnyLoading}>
				<ScanSearch class="w-4 h-4" />
				Inspect
			</DropdownMenu.Item>

			<DropdownMenu.Separator />

			<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={triggerRemove} disabled={isAnyLoading}>
				{#if isDeleting}
					<Loader2 class="w-4 h-4 animate-spin" />
				{:else}
					<Trash2 class="w-4 h-4" />
				{/if}
				Delete
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
