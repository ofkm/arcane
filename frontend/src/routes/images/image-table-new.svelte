<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, HardDrive, Trash2, Loader2, Ellipsis, ScanSearch } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { formatBytes } from '$lib/utils/bytes.util';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import type { ColumnSpec } from '$lib/components/arcane-table';

	let {
		images = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		images: Paginated<ImageSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
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
			const showBecauseUsed = imageFilters.showUsed && img.inUse;
			const showBecauseUnused = imageFilters.showUnused && !img.inUse;
			const usageMatch = showBecauseUsed || showBecauseUnused;

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

	function extractRepoAndTag(repoTags: string[] | undefined) {
		if (!repoTags || repoTags.length === 0 || repoTags[0] === '<none>:<none>') {
			return { repo: '<none>', tag: '<none>' };
		}

		const repoTag = repoTags[0];
		const lastColonIndex = repoTag.lastIndexOf(':');
		if (lastColonIndex === -1) return { repo: repoTag, tag: 'latest' };

		const repo = repoTag.substring(0, lastColonIndex);
		const tag = repoTag.substring(lastColonIndex + 1);
		return { repo: repo || '<none>', tag: tag || '<none>' };
	}

	const columns = [
		{ accessorKey: 'id', title: 'ID', hidden: true },
		{ accessorKey: 'repoTags', title: 'Repository', sortable: true, cell: RepoCell },
		{ id: 'imageId', title: 'Image ID', cell: ImageIdCell },
		{ accessorKey: 'size', title: 'Size', sortable: true, cell: SizeCell },
		{ accessorKey: 'created', title: 'Created', sortable: true, cell: CreatedCell },
		{
			accessorKey: 'inUse',
			title: 'Status',
			sortable: true,
			cell: StatusCell,
			filterFn: (row, columnId, filterValue) => {
				const selected = Array.isArray(filterValue) ? (filterValue as boolean[]) : [];
				if (selected.length === 0) return true;

				const value = Boolean(row.getValue<boolean>(columnId));
				return selected.includes(value);
			}
		},

		{ id: 'updates', title: 'Updates', cell: UpdatesCell }
	] satisfies ColumnSpec<ImageSummaryDto>[];
</script>

{#snippet RepoCell({ item }: { item: ImageSummaryDto })}
	{#if item.repoTags && item.repoTags.length > 0 && item.repoTags[0] !== '<none>:<none>'}
		<a class="font-medium hover:underline" href="/images/{item.id}/">{item.repoTags[0]}</a>
	{:else}
		<span class="text-muted-foreground italic">Untagged</span>
	{/if}
{/snippet}

{#snippet ImageIdCell({ item }: { item: ImageSummaryDto })}
	<code class="bg-muted rounded px-2 py-1 text-xs">{item.id?.substring(7, 19) || 'N/A'}</code>
{/snippet}

{#snippet SizeCell({ value }: { value: unknown })}
	{formatBytes(Number(value ?? 0))}
{/snippet}

{#snippet CreatedCell({ value }: { value: unknown })}
	{formatFriendlyDate(new Date(Number(value || 0) * 1000).toISOString())}
{/snippet}

{#snippet StatusCell({ item }: { item: ImageSummaryDto })}
	{#if item.inUse}
		<StatusBadge text="In Use" variant="green" />
	{:else}
		<StatusBadge text="Unused" variant="amber" />
	{/if}
{/snippet}

{#snippet UpdatesCell({ item }: { item: ImageSummaryDto })}
	{@const { repo, tag } = extractRepoAndTag(item.repoTags)}
	<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.id} {repo} {tag} />
{/snippet}

{#snippet RowActions({ item }: { item: ImageSummaryDto })}
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
{/snippet}

<div>
	<Card.Root>
		<Card.Content class="py-5">
			{#if filteredImages.data.length > 0}
				<ArcaneTable
					items={filteredImages}
					bind:requestOptions
					onRefresh={async (options) => (images = await environmentAPI.getImages(options))}
					{columns}
					rowActions={RowActions}
				/>
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
</div>
