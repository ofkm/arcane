<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/models/image.type';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertCircle, HardDrive, Loader2, Package } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import ImagePullSheet from '$lib/components/sheets/image-pull-sheet.svelte';
	import { formatBytes } from '$lib/utils/bytes.util';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { environmentAPI, imageUpdateAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import ImageTable from './image-table.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';

	let { data }: { data: PageData } = $props();

	let images = $state<EnhancedImageInfo[]>(
		Array.isArray(data.images) ? data.images : data.images.data || []
	);
	let error = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let isLoadingImages = $state(false);
	let requestOptions = $state<SearchPaginationSortRequest>(data.imageRequestOptions);

	let isLoading = $state({
		pulling: false,
		refreshing: false,
		pruning: false,
		checking: false
	});

	let isPullDialogOpen = $state(false);
	let isConfirmPruneDialogOpen = $state(false);

	const totalSize = $derived(images?.reduce((acc, img) => acc + (img.Size || 0), 0) || 0);

	async function loadImages() {
		try {
			isLoadingImages = true;
			const response = await environmentAPI.getImages(
				requestOptions.pagination,
				requestOptions.sort,
				requestOptions.search,
				requestOptions.filters
			);
			images = Array.isArray(response) ? response : response.data || [];
			error = null;
		} catch (err) {
			console.error('Failed to load images:', err);
			error = err instanceof Error ? err.message : 'Failed to load images';
			images = [];
		} finally {
			isLoadingImages = false;
		}
	}

	async function refreshImages() {
		isLoading.refreshing = true;
		try {
			await loadImages();
		} catch (error) {
			console.error('Failed to refresh images:', error);
			toast.error('Failed to refresh images');
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function handlePruneImages() {
		isLoading.pruning = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.pruneImages()),
			message: 'Failed to Prune Images',
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async () => {
				toast.success('Images Pruned Successfully');
				await loadImages();
				isConfirmPruneDialogOpen = false;
			}
		});
	}

	async function handleTriggerBulkUpdateCheck() {
		isLoading.checking = true;
		try {
			const imageRefs = images.map((img) => img.RepoTags?.[0] || `image:${img.Id}`);
			await imageUpdateAPI.checkMultipleImages(imageRefs);
			toast.success('Update check completed');
			await loadImages();
		} catch (error) {
			console.error('Failed to check for updates:', error);
			toast.error('Failed to check for updates');
		} finally {
			isLoading.checking = false;
		}
	}

	async function onRefresh(options: SearchPaginationSortRequest) {
		requestOptions = options;
		await loadImages();
		return {
			data: images,
			pagination: {
				totalPages: Math.ceil(images.length / (requestOptions.pagination?.limit || 20)),
				totalItems: images.length,
				currentPage: requestOptions.pagination?.page || 1,
				itemsPerPage: requestOptions.pagination?.limit || 20
			}
		};
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold">Images</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Container Images</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="remove"
				label="Prune Unused"
				onClick={() => (isConfirmPruneDialogOpen = true)}
				loading={isLoading.pruning}
				loadingLabel="Pruning..."
				disabled={isLoading.pruning}
			/>
			<ArcaneButton
				action="restart"
				onClick={refreshImages}
				label="Refresh"
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Error Loading Images</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isLoadingImages}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Images List</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						<div class="bg-muted h-9 w-32 animate-pulse rounded"></div>
						<div class="bg-muted h-9 w-28 animate-pulse rounded"></div>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
					<p class="text-lg font-medium">Loading Images...</p>
					<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch your images</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<StatCard
				title="Total Images"
				value={images.length}
				icon={HardDrive}
				iconColor="text-blue-500"
				class="border-l-4 border-l-blue-500"
			/>
			<StatCard
				title="Total Size"
				value={formatBytes(totalSize)}
				icon={Package}
				iconColor="text-amber-500"
				class="border-l-4 border-l-amber-500"
			/>
		</div>

		<ImageTable
			{images}
			bind:selectedIds
			{requestOptions}
			{onRefresh}
			onImagesChanged={loadImages}
			onPullDialogOpen={() => (isPullDialogOpen = true)}
			onTriggerBulkUpdateCheck={handleTriggerBulkUpdateCheck}
		/>

		<ImagePullSheet bind:open={isPullDialogOpen} onPullFinished={() => loadImages()} />

		<Dialog.Root bind:open={isConfirmPruneDialogOpen}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Prune Unused Images</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to remove all unused (dangling) Docker images? This will free up
						disk space but cannot be undone. Images actively used by containers will not be
						affected.
					</Dialog.Description>
				</Dialog.Header>
				<div class="flex justify-end gap-3 pt-6">
					<Button
						variant="outline"
						onclick={() => (isConfirmPruneDialogOpen = false)}
						disabled={isLoading.pruning}
					>
						Cancel
					</Button>
					<Button variant="destructive" onclick={handlePruneImages} disabled={isLoading.pruning}>
						{#if isLoading.pruning}
							<Loader2 class="mr-2 size-4 animate-spin" /> Prune Images
						{:else}
							Prune Images
						{/if}
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
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
