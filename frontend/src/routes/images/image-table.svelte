<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import bytes from 'bytes';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import { format } from 'date-fns';
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

	let isLoading = $state({
		removing: false,
		checking: false
	});

	let isPullingInline = $state<Record<string, boolean>>({});

	async function handleDeleteSelected(ids: string[]) {
		if (!ids || ids.length === 0) return;

		openConfirmDialog({
			title: `Remove ${ids.length} Image${ids.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to remove the selected image${ids.length > 1 ? 's' : ''}? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const id of ids) {
						const result = await tryCatch(environmentAPI.deleteImage(id));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to remove image`,
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});
						if (result.error) failureCount++;
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
		{
			id: 'updates',
			accessorFn: (row) => row.updateInfo?.hasUpdate ?? false,
			title: 'Updates',
			cell: UpdatesCell,
			filterFn: (row, columnId, filterValue) => {
				const selected = Array.isArray(filterValue) ? (filterValue as boolean[]) : [];
				if (selected.length === 0) return true;

				const hasUpdate = row.getValue(columnId) as boolean;
				return selected.includes(hasUpdate);
			}
		}
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
	{bytes.format(Number(value ?? 0))}
{/snippet}

{#snippet CreatedCell({ value }: { value: unknown })}
	{format(new Date(Number(value || 0) * 1000), 'PP p')}
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
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => goto(`/images/${item.id}`)}>
					<ScanSearchIcon class="size-4" />
					Inspect
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onclick={() => handleInlineImagePull(item.id, item.repoTags?.[0] || '')}
					disabled={isPullingInline[item.id] || !item.repoTags?.[0]}
				>
					{#if isPullingInline[item.id]}
						<LoaderCircleIcon class="size-4 animate-spin" />
						Pulling...
					{:else}
						<DownloadIcon class="size-4" />
						Pull
					{/if}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onclick={() => deleteImage(item.id)} disabled={isLoading.removing}>
					{#if isLoading.removing}
						<LoaderCircleIcon class="size-4 animate-spin" />
					{:else}
						<Trash2Icon class="size-4" />
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
			<ArcaneTable
				items={images}
				bind:requestOptions
				bind:selectedIds
				onRemoveSelected={(ids) => handleDeleteSelected(ids)}
				onRefresh={async (options) => (images = await environmentAPI.getImages(options))}
				{columns}
				rowActions={RowActions}
			/>
		</Card.Content>
	</Card.Root>
</div>
