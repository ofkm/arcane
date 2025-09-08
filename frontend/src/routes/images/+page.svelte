<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import PackageIcon from '@lucide/svelte/icons/package';
	import { toast } from 'svelte-sonner';
	import ImagePullSheet from '$lib/components/sheets/image-pull-sheet.svelte';
	import bytes from 'bytes';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { environmentAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import ImageTableNew from './image-table.svelte';

	let { data } = $props();

	let images = $state(data.images);
	let requestOptions = $state(data.imageRequestOptions);
	let selectedIds = $state<string[]>([]);

	let isLoading = $state({
		pulling: false,
		refreshing: false,
		pruning: false,
		checking: false
	});

	let isPullDialogOpen = $state(false);
	let isConfirmPruneDialogOpen = $state(false);

	async function handlePruneImages() {
		isLoading.pruning = true;
		const dangling = data.settings?.dockerPruneMode === 'dangling';
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.pruneImages(dangling)),
			message: 'Failed to Prune Images',
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async () => {
				toast.success('Images Pruned Successfully');
				images = await environmentAPI.getImages(requestOptions);
				isConfirmPruneDialogOpen = false;
			}
		});
	}

	async function handleTriggerBulkUpdateCheck() {
		isLoading.checking = true;
		try {
			const imageRefs = images.data.map((img) => img.repoTags?.[0] || `image:${img.id}`);
			await environmentAPI.checkMultipleImages(imageRefs);
			toast.success('Update check completed');
			images = await environmentAPI.getImages(requestOptions);
		} catch (error) {
			console.error('Failed to check for updates:', error);
			toast.error('Failed to check for updates');
		} finally {
			isLoading.checking = false;
		}
	}

	async function refreshImages() {
		isLoading.refreshing = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.getImages(requestOptions)),
			message: 'Failed to Refresh Containers for Updates',
			setLoadingState: (value) => (isLoading.refreshing = value),
			async onSuccess(newImages) {
				images = newImages;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold">Images</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Container Images</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton action="pull" customLabel="Pull Image" onclick={() => (isPullDialogOpen = true)} />
			<ArcaneButton
				action="inspect"
				customLabel="Check Updates"
				onclick={handleTriggerBulkUpdateCheck}
				loading={isLoading.checking}
				loadingLabel="Checking..."
				disabled={isLoading.checking}
			/>
			<ArcaneButton
				action="remove"
				customLabel="Prune Unused"
				onclick={() => (isConfirmPruneDialogOpen = true)}
				loading={isLoading.pruning}
				loadingLabel="Pruning..."
				disabled={isLoading.pruning}
			/>
			<ArcaneButton
				action="restart"
				onclick={refreshImages}
				customLabel="Refresh"
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<StatCard
			title="Total Images"
			value={images.pagination.totalItems}
			icon={HardDriveIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Total Size"
			value={String(bytes.format(data.totalSize))}
			icon={PackageIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
	</div>
	<ImageTableNew bind:images bind:selectedIds bind:requestOptions />

	<ImagePullSheet
		bind:open={isPullDialogOpen}
		onPullFinished={async () => (images = await environmentAPI.getImages(requestOptions))}
	/>

	<Dialog.Root bind:open={isConfirmPruneDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Prune Unused Images</Dialog.Title>
				<Dialog.Description>
					Removes unused Docker images (prune mode: {String(data.settings.dockerPruneMode)}). This frees disk space and cannot be
					undone. Images referenced by any container will not be removed.
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-end gap-3 pt-6">
				<Button variant="outline" onclick={() => (isConfirmPruneDialogOpen = false)} disabled={isLoading.pruning}>Cancel</Button>
				<Button variant="destructive" onclick={handlePruneImages} disabled={isLoading.pruning}>
					{#if isLoading.pruning}
						<LoaderCircleIcon class="mr-2 size-4 animate-spin" /> Prune Images
					{:else}
						Prune Images
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>

<style>
	:global(body) {
		overflow-x: hidden;
	}

	:global([data-radix-popper-content-wrapper]) {
		position: fixed !important;
		z-index: 50;
	}

	:global([data-radix-dropdown-menu-content]) {
		position: fixed !important;
		z-index: 50;
	}

	:global(.tooltip-with-arrow) {
		position: relative;
		overflow: visible;
	}

	:global(.tooltip-with-arrow::before) {
		content: '';
		position: absolute;
		width: 8px;
		height: 8px;
		background-color: hsl(var(--popover));
		border: 1px solid hsl(var(--border));
		z-index: 1;
	}

	:global(.tooltip-with-arrow[data-side='top']::before) {
		bottom: -4px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		border-top: none;
		border-left: none;
	}

	:global(.tooltip-with-arrow[data-side='bottom']::before) {
		top: -4px;
		left: 50%;
		transform: translateX(-50%) rotate(225deg);
		border-bottom: none;
		border-right: none;
	}

	:global(.tooltip-with-arrow[data-side='left']::before) {
		top: 50%;
		right: -4px;
		transform: translateY(-50%) rotate(-45deg);
		border-left: none;
		border-bottom: none;
	}

	:global(.tooltip-with-arrow[data-side='right']::before) {
		top: 50%;
		left: -4px;
		transform: translateY(-50%) rotate(-45deg);
		border-left: none;
		border-top: none;
		box-shadow: -1px 1px 1px rgba(0, 0, 0, 0.05);
	}
</style>
