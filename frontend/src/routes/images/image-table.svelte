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
	import { m } from '$lib/paraglide/messages';

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
			title: m.images_remove_selected_title({ count: ids.length }),
			message: m.images_remove_selected_message({ count: ids.length }),
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const id of ids) {
						const result = await tryCatch(environmentAPI.deleteImage(id));
						handleApiResultWithCallbacks({
							result,
							message: m.images_remove_failed(),
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});
						if (result.error) failureCount++;
					}

					isLoading.removing = false;

					if (successCount > 0) {
						const msg =
							successCount === 1 ? m.images_remove_success_one() : m.images_remove_success_many({ count: successCount });
						toast.success(msg);
						images = await environmentAPI.getImages(requestOptions);
					}
					if (failureCount > 0) {
						const msg = failureCount === 1 ? m.images_remove_failed_one() : m.images_remove_failed_many({ count: failureCount });
						toast.error(msg);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function deleteImage(id: string) {
		openConfirmDialog({
			title: m.images_remove_title(),
			message: m.images_remove_message(),
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;

					const result = await tryCatch(environmentAPI.deleteImage(id));
					handleApiResultWithCallbacks({
						result,
						message: m.images_remove_failed(),
						setLoadingState: () => {},
						onSuccess: async () => {
							toast.success(m.images_remove_success());
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
			toast.error(m.images_pull_no_tag());
			return;
		}

		isPullingInline[imageId] = true;

		const result = await tryCatch(environmentAPI.pullImage(repoTag));
		handleApiResultWithCallbacks({
			result,
			message: m.images_pull_failed(),
			setLoadingState: () => {},
			onSuccess: async () => {
				toast.success(m.images_pull_success({ repoTag }));
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
		{ accessorKey: 'id', title: m.common_id(), hidden: true },
		{ accessorKey: 'repoTags', title: m.images_repository(), sortable: true, cell: RepoCell },
		{ accessorKey: 'size', title: m.images_size(), sortable: true, cell: SizeCell },
		{ accessorKey: 'created', title: m.common_created(), sortable: true, cell: CreatedCell },
		{
			accessorKey: 'inUse',
			title: m.common_status(),
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
			title: m.images_updates(),
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
		<span class="text-muted-foreground italic">{m.images_untagged()}</span>
	{/if}
{/snippet}

{#snippet SizeCell({ value }: { value: unknown })}
	{bytes.format(Number(value ?? 0))}
{/snippet}

{#snippet CreatedCell({ value }: { value: unknown })}
	{format(new Date(Number(value || 0) * 1000), 'PP p')}
{/snippet}

{#snippet StatusCell({ item }: { item: ImageSummaryDto })}
	{#if item.inUse}
		<StatusBadge text={m.common_in_use()} variant="green" />
	{:else}
		<StatusBadge text={m.common_unused()} variant="amber" />
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
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => goto(`/images/${item.id}`)}>
					<ScanSearchIcon class="size-4" />
					{m.common_inspect()}
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onclick={() => handleInlineImagePull(item.id, item.repoTags?.[0] || '')}
					disabled={isPullingInline[item.id] || !item.repoTags?.[0]}
				>
					{#if isPullingInline[item.id]}
						<LoaderCircleIcon class="size-4 animate-spin" />
						{m.images_pulling()}
					{:else}
						<DownloadIcon class="size-4" />
						{m.images_pull()}
					{/if}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onclick={() => deleteImage(item.id)} disabled={isLoading.removing}>
					{#if isLoading.removing}
						<LoaderCircleIcon class="size-4 animate-spin" />
					{:else}
						<Trash2Icon class="size-4" />
					{/if}
					{m.common_remove()}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root>
	<Card.Content class="py-5">
		<ArcaneTable
			persistKey="arcane-image-table"
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
