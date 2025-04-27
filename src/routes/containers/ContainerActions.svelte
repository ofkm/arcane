<script lang="ts">
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { ScanSearch, Play, RotateCcw, StopCircle, Trash2, Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';

	let { id, itemState }: { id: string; itemState: string } = $props();

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false
	});
	let showRemoveConfirm = $state(false);

	function viewContainer() {
		goto(`/containers/${id}`);
	}

	async function performContainerAction(action: 'start' | 'stop' | 'restart' | 'remove') {
		if (action === 'remove') {
			showRemoveConfirm = true;
			return;
		}

		isLoading[action] = true;
		const method = 'POST';
		const endpoint = `/api/containers/${id}/${action}`;

		try {
			const response = await fetch(endpoint, { method });
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || `Failed to ${action} container`);
			}

			toast.success(`Container ${action}ed successfully.`);
			await invalidateAll();
		} catch (error: any) {
			console.error(`Failed to ${action} container ${id}:`, error);
			toast.error(`Failed to ${action} container: ${error.message}`);
		} finally {
			isLoading[action] = false;
		}
	}

	async function handleRemoveConfirm(force?: boolean) {
		showRemoveConfirm = false;
		isLoading.remove = true;
		const method = 'DELETE';
		const endpoint = `/api/containers/${id}/remove${force ? '?force=true' : ''}`;

		console.log(`Attempting to remove container ${id} at endpoint: ${endpoint}`);

		try {
			const response = await fetch(endpoint, { method });
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || `Failed to remove container`);
			}

			toast.success(`Container removed successfully.`);
			await invalidateAll();
		} catch (error: any) {
			console.error(`Failed to remove container ${id}:`, error);
			toast.error(`Failed to remove container: ${error.message}`);
		} finally {
			isLoading.remove = false;
		}
	}

	const isRunning = $derived(itemState === 'running');
	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	const removeDescription = $derived(`Are you sure you want to remove container ${id}? This action cannot be undone.`);
</script>

<!-- Confirmation Dialog for Remove -->
<ConfirmDialog bind:open={showRemoveConfirm} itemType={'container'} {isRunning} title="Confirm Removal" description={removeDescription} confirmLabel="Remove" variant="destructive" onConfirm={handleRemoveConfirm} />

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
			<DropdownMenu.Item onclick={viewContainer} disabled={isAnyLoading}>
				<ScanSearch class="w-4 h-4" />
				Inspect
			</DropdownMenu.Item>

			{#if !isRunning}
				<DropdownMenu.Item onclick={() => performContainerAction('start')} disabled={isLoading.start || isAnyLoading}>
					{#if isLoading.start}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<Play class="w-4 h-4" />
					{/if}
					Start
				</DropdownMenu.Item>
			{:else}
				<DropdownMenu.Item onclick={() => performContainerAction('restart')} disabled={isLoading.restart || isAnyLoading}>
					{#if isLoading.restart}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<RotateCcw class="w-4 h-4" />
					{/if}
					Restart
				</DropdownMenu.Item>

				<DropdownMenu.Item onclick={() => performContainerAction('stop')} disabled={isLoading.stop || isAnyLoading}>
					{#if isLoading.stop}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<StopCircle class="w-4 h-4" />
					{/if}
					Stop
				</DropdownMenu.Item>
			{/if}

			<DropdownMenu.Separator />

			<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={() => performContainerAction('remove')} disabled={isLoading.remove || isAnyLoading}>
				{#if isLoading.remove}
					<Loader2 class="w-4 h-4 animate-spin" />
				{:else}
					<Trash2 class="w-4 h-4" />
				{/if}
				Remove
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
