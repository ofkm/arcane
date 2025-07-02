<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/models/image.type';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Download,
		AlertCircle,
		HardDrive,
		Trash2,
		Loader2,
		ChevronDown,
		Ellipsis,
		ScanSearch,
		Funnel,
		Package
	} from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ImagePullSheet from '$lib/components/sheets/image-pull-sheet.svelte';
	import { formatBytes } from '$lib/utils/bytes.util';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import MaturityItem from '$lib/components/maturity-item.svelte';
	import {
		maturityStore,
		triggerBulkMaturityCheck,
		enhanceImagesWithMaturity,
		loadImageMaturityBatch
	} from '$lib/stores/maturity-store';
	import { environmentAPI } from '$lib/services/api';
	import { onMount } from 'svelte';
	import StatCard from '$lib/components/stat-card.svelte';

	let { data }: { data: PageData } = $props();

	let images = $state<EnhancedImageInfo[]>([]);
	let error = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let isLoadingImages = $state(true);

	let imageFilters = $state({
		showUsed: true,
		showUnused: true
	});

	let isLoading = $state({
		pulling: false,
		removing: false,
		refreshing: false,
		pruning: false,
		checking: false
	});

	let isPullingInline = $state<Record<string, boolean>>({});
	let isPullDialogOpen = $state(false);
	let isConfirmPruneDialogOpen = $state(false);

	const totalImages = $derived(images?.length || 0);
	const totalSize = $derived(images?.reduce((acc, img) => acc + (img.Size || 0), 0) || 0);

	const enhancedImages = $derived(enhanceImagesWithMaturity(images, $maturityStore.maturityData));
	const filteredImages = $derived(
		enhancedImages.filter(
			(img) => (imageFilters.showUsed && img.InUse) || (imageFilters.showUnused && !img.InUse)
		) as EnhancedImageInfo[]
	);

	async function loadImages() {
		try {
			isLoadingImages = true;
			const response = await environmentAPI.getImages();
			images = response || [];
			error = null;
		} catch (err) {
			console.error('Failed to load images:', err);
			error = err instanceof Error ? err.message : 'Failed to load images';
			images = [];
		} finally {
			isLoadingImages = false;
		}
	}

	onMount(() => {
		loadImages();
	});

	$effect(() => {
		if (images && images.length > 0) {
			loadImagesMaturity();
		}
	});

	async function loadImagesMaturity() {
		if (!images || images.length === 0) return;

		const imageIds = images.map((img) => img.Id);
		await loadImageMaturityBatch(imageIds);
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

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: `Remove ${selectedIds.length} Image${selectedIds.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to remove the selected image${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const id of selectedIds) {
						const result = await tryCatch(environmentAPI.deleteImage(id));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to remove image`,
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});

						if (result.error) {
							failureCount++;
						}
					}

					isLoading.removing = false;

					if (successCount > 0) {
						toast.success(
							`Successfully removed ${successCount} image${successCount > 1 ? 's' : ''}`
						);
						await loadImages();
					}

					if (failureCount > 0) {
						toast.error(`Failed to remove ${failureCount} image${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
			}
		});
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

	async function handleTriggerBulkMaturityCheck() {
		isLoading.checking = true;
		await triggerBulkMaturityCheck();
		isLoading.checking = false;
	}

	async function handleInlineImagePull(imageId: string, imageTag: string) {
		if (!imageTag) return;

		const imageIdentifier = imageId;
		isPullingInline = { ...isPullingInline, [imageIdentifier]: true };

		try {
			const result = await tryCatch(environmentAPI.pullImage(imageTag));
			handleApiResultWithCallbacks({
				result,
				message: `Failed to pull image ${imageTag}`,
				setLoadingState: () => {},
				onSuccess: async () => {
					toast.success(`Image ${imageTag} pulled successfully`);
					await loadImages();
				}
			});
		} finally {
			isPullingInline = { ...isPullingInline, [imageIdentifier]: false };
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Container Images</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Container Images</p>
		</div>
		<div class="flex items-center gap-2">
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
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each Array(2) as _}
				<Card.Root>
					<Card.Content class="flex items-center justify-between p-4">
						<div class="space-y-2">
							<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
							<div class="bg-muted h-8 w-12 animate-pulse rounded"></div>
						</div>
						<div class="bg-muted size-10 animate-pulse rounded-full"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

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
				value={totalImages}
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

		{#if filteredImages.length > 0}
			<Card.Root class="border shadow-sm">
				<Card.Header class="px-6">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Images List</Card.Title>
						</div>
						<div class="flex items-center gap-2">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="outline" size="sm">
											<Funnel class="mr-2 size-4" />
											Filter
											<ChevronDown class="ml-2 size-4" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Label>Image Usage</DropdownMenu.Label>
									<DropdownMenu.CheckboxItem
										checked={imageFilters.showUsed}
										onCheckedChange={(checked) => {
											imageFilters.showUsed = checked;
										}}
									>
										Show Used Images
									</DropdownMenu.CheckboxItem>
									<DropdownMenu.CheckboxItem
										checked={imageFilters.showUnused}
										onCheckedChange={(checked) => {
											imageFilters.showUnused = checked;
										}}
									>
										Show Unused Images
									</DropdownMenu.CheckboxItem>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
							{#if selectedIds.length > 0}
								<ArcaneButton
									action="remove"
									onClick={() => handleDeleteSelected()}
									loading={isLoading.removing}
									disabled={isLoading.removing}
								/>
							{/if}
							<ArcaneButton
								action="remove"
								label="Prune Unused"
								onClick={() => (isConfirmPruneDialogOpen = true)}
								loading={isLoading.pruning}
								loadingLabel="Pruning..."
								disabled={isLoading.pruning}
							/>
							<ArcaneButton
								action="pull"
								label="Pull Image"
								onClick={() => (isPullDialogOpen = true)}
								loading={isLoading.pulling}
								loadingLabel="Pulling..."
								disabled={isLoading.pulling}
							/>
							<ArcaneButton
								action="inspect"
								label="Recheck Maturities"
								onClick={() => handleTriggerBulkMaturityCheck()}
								loading={isLoading.checking}
								loadingLabel="Checking..."
								disabled={isLoading.checking}
							/>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<UniversalTable
						data={filteredImages}
						columns={[
							{ accessorKey: 'RepoTags', header: 'Repository:Tag' },
							{ accessorKey: 'Id', header: 'Image ID' },
							{ accessorKey: 'Size', header: 'Size' },
							{ accessorKey: 'Created', header: 'Created' },
							{ accessorKey: 'InUse', header: 'Status' },
							{ accessorKey: 'maturity', header: 'Maturity' },
							{ accessorKey: 'actions', header: ' ', enableSorting: false }
						]}
						pagination={{
							pageSize: tablePersistence.getPageSize('images')
						}}
						onPageSizeChange={(newSize) => {
							tablePersistence.setPageSize('images', newSize);
						}}
						sort={{
							defaultSort: { id: 'Created', desc: true }
						}}
						display={{
							filterPlaceholder: 'Search images...',
							noResultsMessage: 'No images found'
						}}
						bind:selectedIds
					>
						{#snippet rows({ item })}
							<Table.Cell>
								{#if item.RepoTags && item.RepoTags.length > 0 && item.RepoTags[0] !== '<none>:<none>'}
									{item.RepoTags[0]}
								{:else}
									<span class="text-muted-foreground italic">Untagged</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<code class="bg-muted rounded px-2 py-1 text-xs"
									>{item.Id?.substring(7, 19) || 'N/A'}</code
								>
							</Table.Cell>
							<Table.Cell>{formatBytes(item.Size || 0)}</Table.Cell>
							<Table.Cell>{new Date((item.Created || 0) * 1000).toLocaleDateString()}</Table.Cell>
							<Table.Cell>
								{#if item.InUse}
									<StatusBadge text="In Use" variant="green" />
								{:else}
									<StatusBadge text="Unused" variant="amber" />
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if item.maturity}
									<MaturityItem maturity={item.maturity} imageId={item.Id} />
								{:else}
									<span class="text-muted-foreground text-sm">N/A</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
												<span class="sr-only">Open menu</span>
												<Ellipsis />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Group>
											<DropdownMenu.Item onclick={() => goto(`/images/${item.Id}`)}>
												<ScanSearch class="size-4" />
												Inspect
											</DropdownMenu.Item>
											<DropdownMenu.Item
												onclick={() => handleInlineImagePull(item.Id, item.RepoTags?.[0] || '')}
												disabled={isPullingInline[item.Id] || !item.RepoTags?.[0]}
											>
												{#if isPullingInline[item.Id]}
													<Loader2 class="size-4 animate-spin" />
													Pulling...
												{:else}
													<Download class="size-4" />
													Pull
												{/if}
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<DropdownMenu.Item
												class="focus:text-red-700! text-red-500"
												onclick={() => handleDeleteSelected()}
												disabled={isLoading.removing}
											>
												{#if isLoading.removing}
													<Loader2 class="size-4 animate-spin" />
												{:else}
													<Trash2 class="size-4" />
												{/if}
												Remove
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						{/snippet}
					</UniversalTable>
				</Card.Content>
			</Card.Root>
		{:else if !error}
			<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
				<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
				<p class="text-lg font-medium">No images found</p>
				<p class="text-muted-foreground mt-1 max-w-md text-sm">
					Pull an image using the "Pull Image" button above
				</p>
				<div class="mt-4 flex gap-3">
					<Button variant="outline" onclick={() => (isPullDialogOpen = true)}>
						<Download class="size-4" />
						Pull Image
					</Button>
				</div>
			</div>
		{/if}

		<ImagePullSheet bind:open={isPullDialogOpen} onPullFinished={() => loadImages()} />

		<Dialog.Root bind:open={isConfirmPruneDialogOpen}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Prune Unused Images</Dialog.Title>
					<Dialog.Description
						>Are you sure you want to remove all unused (dangling) Docker images? This will free up
						disk space but cannot be undone. Images actively used by containers will not be
						affected.</Dialog.Description
					>
				</Dialog.Header>
				<div class="flex justify-end gap-3 pt-6">
					<Button
						variant="outline"
						onclick={() => (isConfirmPruneDialogOpen = false)}
						disabled={isLoading.pruning}>Cancel</Button
					>
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
