<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, HardDrive, Trash2, Loader2, Ellipsis, ScanSearch } from '@lucide/svelte';
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
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import FilterDropdown from '$lib/components/dropdowns/filter-dropdown.svelte';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import { formatFriendlyDate } from '$lib/utils/date.utils';

	let {
		images = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onPullDialogOpen,
		onTriggerBulkUpdateCheck
	}: {
		images: Paginated<ImageSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
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

	const filteredImages: Paginated<ImageSummaryDto> = $derived({
		...images,
		data: images.data.filter((img) => {
			// Usage filtering
			const showBecauseUsed = imageFilters.showUsed && img.inUse;
			const showBecauseUnused = imageFilters.showUnused && !img.inUse;
			const usageMatch = showBecauseUsed || showBecauseUnused;

			// Update status filtering
			const updateStatus = getImageUpdateStatus(img.updateInfo);
			const showBecauseHasUpdates = imageFilters.showWithUpdates && updateStatus === 'has-updates';
			const showBecauseNoUpdates = imageFilters.showWithoutUpdates && updateStatus === 'no-updates';
			const updateMatch = showBecauseHasUpdates || showBecauseNoUpdates;

			return usageMatch && updateMatch;
		})
	});

	function getImageUpdateStatus(updateInfo: any): 'has-updates' | 'no-updates' {
		if (!updateInfo) return 'no-updates';

		if (updateInfo.error) return 'no-updates';

		return updateInfo.hasUpdate === true ? 'has-updates' : 'no-updates';
	}

	async function deleteImage(id: string) {
		openConfirmDialog({
			title: 'Remove Image',
			message: 'Are you sure you want to remove this image? This action cannot be undone.',
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;

					const result = await tryCatch(environmentAPI.deleteImage(id));
					handleApiResultWithCallbacks({
						result,
						message: 'Failed to remove image',
						setLoadingState: () => {},
						onSuccess: async () => {
							toast.success('Image removed successfully');
							images = await environmentAPI.getImages(requestOptions);
						}
					});

					isLoading.removing = false;
				}
			}
		});
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
						toast.success(`Successfully removed ${successCount} image${successCount > 1 ? 's' : ''}`);
						images = await environmentAPI.getImages(requestOptions);
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
				images = await environmentAPI.getImages(requestOptions);
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

{#if images.data.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Images List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					<FilterDropdown bind:filters={imageFilters}>
						{#snippet children({ filters })}
							<DropdownMenu.Label>Image Usage</DropdownMenu.Label>
							<DropdownMenu.CheckboxItem
								checked={filters.showUsed}
								onCheckedChange={(checked) => {
									filters.showUsed = checked;
								}}
							>
								Show Used Images
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={filters.showUnused}
								onCheckedChange={(checked) => {
									filters.showUnused = checked;
								}}
							>
								Show Unused Images
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.Separator />
							<DropdownMenu.Label>Update Status</DropdownMenu.Label>
							<DropdownMenu.CheckboxItem
								checked={filters.showWithUpdates}
								onCheckedChange={(checked) => {
									filters.showWithUpdates = checked;
								}}
							>
								Show Images with Updates
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={filters.showWithoutUpdates}
								onCheckedChange={(checked) => {
									filters.showWithoutUpdates = checked;
								}}
							>
								Show Images without Updates
							</DropdownMenu.CheckboxItem>
						{/snippet}
					</FilterDropdown>
					{#if selectedIds.length > 0}
						<ArcaneButton
							action="remove"
							onclick={() => handleDeleteSelected()}
							loading={isLoading.removing}
							disabled={isLoading.removing}
							customLabel="Remove Selected"
						/>
					{/if}
					<ArcaneButton action="pull" customLabel="Pull Image" onclick={onPullDialogOpen} />
					<ArcaneButton
						action="inspect"
						customLabel="Check Updates"
						onclick={handleTriggerBulkUpdateCheckInternal}
						loading={isLoading.checking}
						loadingLabel="Checking..."
						disabled={isLoading.checking}
					/>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if filteredImages.data.length > 0}
				<ArcaneTable
					items={filteredImages}
					bind:requestOptions
					bind:selectedIds
					onRefresh={async (options) => (images = await environmentAPI.getImages(options))}
					columns={[
						{ label: 'Repository', sortColumn: 'repoTags' },
						{ label: 'Image ID' },
						{ label: 'Size', sortColumn: 'size' },
						{ label: 'Created', sortColumn: 'created' },
						{ label: 'Status', sortColumn: 'inUse' },
						{ label: 'Updates' },
						{ label: ' ' }
					]}
					filterPlaceholder="Search images..."
					noResultsMessage="No images found"
				>
					{#snippet rows({ item })}
						{@const { repo, tag } = extractRepoAndTag(item.repoTags)}
						<Table.Cell>
							{#if item.repoTags && item.repoTags.length > 0 && item.repoTags[0] !== '<none>:<none>'}
								<a class="font-medium hover:underline" href="/images/{item.id}/">{item.repoTags[0]}</a>
							{:else}
								<span class="text-muted-foreground italic">Untagged</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<code class="bg-muted rounded px-2 py-1 text-xs">{item.id?.substring(7, 19) || 'N/A'}</code>
						</Table.Cell>
						<Table.Cell class="py-3 md:py-3.5">{formatBytes(item.size)}</Table.Cell>
						<Table.Cell>{formatFriendlyDate(new Date((item.created || 0) * 1000).toISOString())}</Table.Cell>
						<Table.Cell>
							{#if item.inUse}
								<StatusBadge text="In Use" variant="green" />
							{:else}
								<StatusBadge text="Unused" variant="amber" />
							{/if}
						</Table.Cell>
						<Table.Cell>
							<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.id} {repo} {tag} />
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
										<DropdownMenu.Item onclick={() => goto(`/images/${item.id}`)}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() => handleInlineImagePull(item.id, item.repoTags?.[0] || '')}
											disabled={isPullingInline[item.id] || !item.repoTags?.[0]}
										>
											{#if isPullingInline[item.id]}
												<Loader2 class="size-4 animate-spin" />
												Pulling...
											{:else}
												<Download class="size-4" />
												Pull
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item variant="destructive" onclick={() => deleteImage(item.id)} disabled={isLoading.removing}>
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
			{:else}
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
					<p class="text-lg font-medium">No images match current filters</p>
					<p class="text-muted-foreground mt-1 max-w-md text-sm">
						Adjust your filters to see images, or pull new images using the "Pull Image" button above
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No images found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">Pull an image using the "Pull Image" button above</p>
		<div class="mt-4 flex gap-3">
			<Button variant="outline" onclick={onPullDialogOpen}>
				<Download class="size-4" />
				Pull Image
			</Button>
		</div>
	</div>
{/if}
