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
	import ImageTable from './image-table.svelte';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	let { images, imageUsageCounts, imageRequestOptions: requestOptions } = $state(data);
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
			message: m.images_prune_failed(),
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async () => {
				toast.success(m.images_pruned_success());
				images = await environmentAPI.getImages(requestOptions);
				isConfirmPruneDialogOpen = false;
			}
		});
	}

	async function handleTriggerBulkUpdateCheck() {
		isLoading.checking = true;
		try {
			await environmentAPI.checkAllImages();
			toast.success(m.images_update_check_completed());
			images = await environmentAPI.getImages(requestOptions);
		} catch (error) {
			console.error('Failed to check for updates:', error);
			toast.error(m.images_update_check_failed());
		} finally {
			isLoading.checking = false;
		}
	}

	async function refreshImages() {
		isLoading.refreshing = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.getImages(requestOptions)),
			message: m.images_refresh_failed(),
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
			<h1 class="text-2xl font-bold">{m.images_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{m.images_subtitle()}</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton action="pull" customLabel={m.images_pull_image()} onclick={() => (isPullDialogOpen = true)} />
			<ArcaneButton
				action="inspect"
				customLabel={m.images_check_updates()}
				onclick={handleTriggerBulkUpdateCheck}
				loading={isLoading.checking}
				loadingLabel={m.images_checking()}
				disabled={isLoading.checking}
			/>
			<ArcaneButton
				action="remove"
				customLabel={m.images_prune_unused()}
				onclick={() => (isConfirmPruneDialogOpen = true)}
				loading={isLoading.pruning}
				loadingLabel={m.images_pruning()}
				disabled={isLoading.pruning}
			/>
			<ArcaneButton
				action="restart"
				onclick={refreshImages}
				customLabel={m.common_refresh()}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<StatCard
			title={m.images_total()}
			value={imageUsageCounts.totalImages}
			icon={HardDriveIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title={m.images_total_size()}
			value={String(bytes.format(imageUsageCounts.totalImageSize))}
			icon={PackageIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
	</div>
	<ImageTable bind:images bind:selectedIds bind:requestOptions />

	<ImagePullSheet
		bind:open={isPullDialogOpen}
		onPullFinished={async () => (images = await environmentAPI.getImages(requestOptions))}
	/>

	<Dialog.Root bind:open={isConfirmPruneDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{m.images_prune_confirm_title()}</Dialog.Title>
				<Dialog.Description>
					{m.images_prune_confirm_description({ mode: String(data.settings.dockerPruneMode) })}
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-end gap-3 pt-6">
				<Button variant="outline" onclick={() => (isConfirmPruneDialogOpen = false)} disabled={isLoading.pruning}>
					{m.common_cancel()}
				</Button>
				<Button variant="destructive" onclick={handlePruneImages} disabled={isLoading.pruning}>
					{#if isLoading.pruning}
						<LoaderCircleIcon class="mr-2 size-4 animate-spin" /> {m.images_pruning()}
					{:else}
						{m.images_prune_action()}
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
