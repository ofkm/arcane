<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Checkbox from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { AlertCircle, Trash2, Loader2 } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';

	type PruneType = 'containers' | 'images' | 'networks' | 'volumes';

	interface Props {
		open?: boolean;
		isPruning?: boolean;
		imagePruneMode?: 'dangling' | 'all';
		onConfirm?: (selectedTypes: PruneType[]) => void;
		onCancel?: () => void;
	}

	let { open = $bindable(), isPruning = false, imagePruneMode = 'dangling', onConfirm = () => {}, onCancel = () => {} }: Props = $props();

	let pruneContainers = $state(true);
	let pruneImages = $state(true);
	let pruneNetworks = $state(true);
	let pruneVolumes = $state(false);

	const selectedTypes = $derived.by(() => {
		const types: PruneType[] = [];
		if (pruneContainers) types.push('containers');
		if (pruneImages) types.push('images');
		if (pruneNetworks) types.push('networks');
		if (pruneVolumes) types.push('volumes');
		return types;
	});

	function handleConfirm() {
		if (selectedTypes.length > 0 && !isPruning) {
			onConfirm(selectedTypes);
		}
	}

	function handleCancel() {
		if (!isPruning) {
			onCancel();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isPruning) {
			handleCancel();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleCancel()}>
	<Dialog.Content class="sm:max-w-[450px]" onkeydown={handleKeydown}>
		<Dialog.Header>
			<Dialog.Title>Confirm System Prune</Dialog.Title>
			<Dialog.Description>Select the resources you want to prune. This action permanently removes unused data and cannot be undone.</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-containers" bind:checked={pruneContainers} disabled={isPruning} />
				<Label for="prune-containers" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Stopped Containers</Label>
			</div>
			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-images" bind:checked={pruneImages} disabled={isPruning} />
				<Label for="prune-images" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
					Unused Images ({imagePruneMode === 'dangling' ? 'Dangling Only' : 'All Unused'})
				</Label>
			</div>
			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-networks" bind:checked={pruneNetworks} disabled={isPruning} />
				<Label for="prune-networks" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Unused Networks</Label>
			</div>
			<div class="flex items-start space-x-3">
				<Checkbox.Root id="prune-volumes" bind:checked={pruneVolumes} disabled={isPruning} class="mt-1" />
				<div class="grid gap-1.5 leading-none">
					<Label for="prune-volumes" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						Unused Volumes <span class="text-destructive">(Potentially Destructive!)</span>
					</Label>
					<p class="text-xs text-muted-foreground">Only enable this if you are certain no important data resides in unused volumes.</p>
				</div>
			</div>

			{#if pruneVolumes}
				<Alert.Root variant="destructive" class="mt-2">
					<AlertCircle class="size-4" />
					<Alert.Title>Warning: Pruning Volumes</Alert.Title>
					<Alert.Description>Pruning volumes permanently deletes data. Ensure you have backups if necessary.</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer>
			<Button class="arcane-button-cancel" variant="outline" onclick={handleCancel} disabled={isPruning}>Cancel</Button>
			<Button class="arcane-button-remove" variant="destructive" onclick={handleConfirm} disabled={selectedTypes.length === 0 || isPruning}>
				{#if isPruning}
					<Loader2 class="mr-2 animate-spin size-4" /> Pruning...
				{:else}
					<Trash2 class="mr-2 size-4" /> Prune Selected ({selectedTypes.length})
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
