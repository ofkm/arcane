<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Checkbox from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { m } from '$lib/paraglide/messages';

	type PruneType = 'containers' | 'images' | 'networks' | 'volumes' | 'buildCache';

	interface Props {
		open?: boolean;
		isPruning?: boolean;
		imagePruneMode?: 'dangling' | 'all';
		onConfirm?: (selectedTypes: PruneType[]) => void;
		onCancel?: () => void;
	}

	let {
		open = $bindable(),
		isPruning = false,
		imagePruneMode = 'dangling',
		onConfirm = () => {},
		onCancel = () => {}
	}: Props = $props();

	let pruneContainers = $state(true);
	let pruneImages = $state(true);
	let pruneNetworks = $state(true);
	let pruneVolumes = $state(false);
	let pruneBuildCache = $state(false);

	const selectedTypes = $derived.by(() => {
		const types: PruneType[] = [];
		if (pruneContainers) types.push('containers');
		if (pruneImages) types.push('images');
		if (pruneNetworks) types.push('networks');
		if (pruneVolumes) types.push('volumes');
		if (pruneBuildCache) types.push('buildCache');
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
			<Dialog.Title>{m.prune_confirm_system_title()}</Dialog.Title>
			<Dialog.Description>{m.prune_confirm_description()}</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-containers" bind:checked={pruneContainers} disabled={isPruning} />
				<Label
					for="prune-containers"
					class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{m.prune_stopped_containers()}
				</Label>
			</div>

			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-images" bind:checked={pruneImages} disabled={isPruning} />
				<Label
					for="prune-images"
					class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{m.prune_unused_images()} ({imagePruneMode === 'dangling' ? m.prune_images_mode_dangling() : m.prune_images_mode_all()})
				</Label>
			</div>

			<!-- Build cache -->
			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-build-cache" bind:checked={pruneBuildCache} disabled={isPruning} />
				<Label
					for="prune-build-cache"
					class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{m.build_cache()}
				</Label>
			</div>

			<div class="flex items-center space-x-3">
				<Checkbox.Root id="prune-networks" bind:checked={pruneNetworks} disabled={isPruning} />
				<Label
					for="prune-networks"
					class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{m.prune_unused_networks()}
				</Label>
			</div>

			<div class="flex items-start space-x-3">
				<Checkbox.Root id="prune-volumes" bind:checked={pruneVolumes} disabled={isPruning} class="mt-1" />
				<div class="grid gap-1.5 leading-none">
					<Label for="prune-volumes" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						{m.prune_unused_volumes()} <span class="text-destructive">{m.prune_potentially_destructive()}</span>
					</Label>
					<p class="text-muted-foreground text-xs">{m.prune_volumes_guidance()}</p>
				</div>
			</div>

			{#if pruneVolumes}
				<Alert.Root variant="destructive" class="mt-2">
					<AlertCircleIcon class="size-4" />
					<Alert.Title>{m.prune_volumes_warning_title()}</Alert.Title>
					<Alert.Description>{m.prune_volumes_warning_description()}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer>
			<Button class="arcane-button-cancel" variant="outline" onclick={handleCancel} disabled={isPruning}>
				{m.common_cancel()}
			</Button>
			<Button
				class="arcane-button-remove"
				variant="destructive"
				onclick={handleConfirm}
				disabled={selectedTypes.length === 0 || isPruning}
			>
				{#if isPruning}
					<Spinner class="mr-2 size-4" /> {m.images_pruning()}
				{:else}
					<Trash2Icon class="mr-2 size-4" /> {m.prune_button({ count: selectedTypes.length })}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
