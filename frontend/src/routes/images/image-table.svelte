<script lang="ts">
	import type { EnhancedImageInfo } from '$lib/models/image.type';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Download,
		HardDrive,
		Trash2,
		Loader2,
		ChevronDown,
		Ellipsis,
		ScanSearch,
		Funnel
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { formatBytes } from '$lib/utils/bytes.util';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';

	interface ImageWithId extends EnhancedImageInfo {
		id: string;
	}

	let {
		images,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onImagesChanged,
		onPullDialogOpen,
		onTriggerBulkUpdateCheck
	}: {
		images: EnhancedImageInfo[];
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<any>;
		onImagesChanged: () => Promise<void>;
		onPullDialogOpen: () => void;
		onTriggerBulkUpdateCheck: () => Promise<void>;
	} = $props();

	let imageFilters = $state({
		showUsed: true,
		showUnused: true,
		showWithUpdates: true,
		showWithoutUpdates: true
	});

	let isLoading = $state({
		removing: false,
		checking: false
	});

	let isPullingInline = $state<Record<string, boolean>>({});

	const imagesWithId = $derived(
		images.map((img) => ({
			...img,
			id: img.Id
		}))
	);

	const filteredImages = $derived(
		imagesWithId.filter((img) => {
			const showBecauseUsed = imageFilters.showUsed && img.InUse;
			const showBecauseUnused = imageFilters.showUnused && !img.InUse;
			const usageMatch = showBecauseUsed || showBecauseUnused;

			const hasUpdates = img.updateInfo?.hasUpdate || false;
			const showBecauseHasUpdates = imageFilters.showWithUpdates && hasUpdates;
			const showBecauseNoUpdates = imageFilters.showWithoutUpdates && !hasUpdates;
			const updateMatch = showBecauseHasUpdates || showBecauseNoUpdates;

			return usageMatch && updateMatch;
		})
	);

	const paginatedImages: Paginated<ImageWithId> = $derived({
		data: filteredImages,
		pagination: {
			totalPages: Math.ceil(filteredImages.length / (requestOptions.pagination?.limit || 20)),
			totalItems: filteredImages.length,
			currentPage: requestOptions.pagination?.page || 1,
			itemsPerPage: requestOptions.pagination?.limit || 20
		}
	});

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
						await onImagesChanged();
					}

					if (failureCount > 0) {
						toast.error(`Failed to remove ${failureCount} image${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function handleInlineImagePull(imageId: string, repoTag: string) {
		if (!repoTag || repoTag === '<none>:<none>') {
			toast.error('Cannot pull image without repository tag');
			return;
		}

		isPullingInline[imageId] = true;

		const result = await tryCatch(environmentAPI.pullImage(repoTag));
		handleApiResultWithCallbacks({
			result,
			message: 'Failed to Pull Image',
			setLoadingState: () => {},
			onSuccess: async () => {
				toast.success(`Successfully pulled ${repoTag}`);
				await onImagesChanged();
			}
		});

		isPullingInline[imageId] = false;
	}

	async function handleTriggerBulkUpdateCheckInternal() {
		isLoading.checking = true;
		await onTriggerBulkUpdateCheck();
		isLoading.checking = false;
	}

	function extractRepoAndTag(repoTags: string[] | undefined) {
		if (!repoTags || repoTags.length === 0 || repoTags[0] === '<none>:<none>') {
			return { repo: '<none>', tag: '<none>' };
		}

		const repoTag = repoTags[0];
		const lastColonIndex = repoTag.lastIndexOf(':');

		if (lastColonIndex === -1) {
			return { repo: repoTag, tag: 'latest' };
		}

		const repo = repoTag.substring(0, lastColonIndex);
		const tag = repoTag.substring(lastColonIndex + 1);

		return { repo: repo || '<none>', tag: tag || '<none>' };
	}
</script>

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
							<DropdownMenu.Separator />
							<DropdownMenu.Label>Update Status</DropdownMenu.Label>
							<DropdownMenu.CheckboxItem
								checked={imageFilters.showWithUpdates}
								onCheckedChange={(checked) => {
									imageFilters.showWithUpdates = checked;
								}}
							>
								Show Images with Updates
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={imageFilters.showWithoutUpdates}
								onCheckedChange={(checked) => {
									imageFilters.showWithoutUpdates = checked;
								}}
							>
								Show Images without Updates
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
					<ArcaneButton action="pull" label="Pull Image" onClick={onPullDialogOpen} />
					<ArcaneButton
						action="inspect"
						label="Check Updates"
						onClick={handleTriggerBulkUpdateCheckInternal}
						loading={isLoading.checking}
						loadingLabel="Checking..."
						disabled={isLoading.checking}
					/>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={paginatedImages}
				bind:requestOptions
				bind:selectedIds
				{onRefresh}
				columns={[
					{ label: 'Repository', sortColumn: 'RepoTags' },
					{ label: 'Image ID' },
					{ label: 'Size', sortColumn: 'Size' },
					{ label: 'Created', sortColumn: 'Created' },
					{ label: 'Status', sortColumn: 'InUse' },
					{ label: 'Updates' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search images..."
				noResultsMessage="No images found"
			>
				{#snippet rows({ item })}
					{@const { repo, tag } = extractRepoAndTag(item.RepoTags)}
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
						<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.Id} {repo} {tag} />
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
			</ArcaneTable>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No images found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">
			Pull an image using the "Pull Image" button above
		</p>
		<div class="mt-4 flex gap-3">
			<Button variant="outline" onclick={onPullDialogOpen}>
				<Download class="size-4" />
				Pull Image
			</Button>
		</div>
	</div>
{/if}
