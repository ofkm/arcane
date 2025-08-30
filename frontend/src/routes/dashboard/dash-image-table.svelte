<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import { environmentAPI } from '$lib/services/api';
	import bytes from 'bytes';
	import type { ColumnSpec } from '$lib/components/arcane-table';

	let {
		images = $bindable(),
		isLoading
	}: {
		images: Paginated<ImageSummaryDto>;
		isLoading: boolean;
	} = $props();

	let requestOptions = $state<SearchPaginationSortRequest>({
		pagination: { page: 1, limit: 5 },
		sort: { column: 'size', direction: 'desc' }
	});

	let selectedIds = $state<string[]>([]);

	const columns = [
		{ accessorKey: 'repoTags', title: 'Name', cell: NameCell },
		{ accessorKey: 'inUse', title: 'Status', cell: StatusCell },
		{ id: 'tag', title: 'Tag', cell: TagCell },
		{ accessorKey: 'size', title: 'Size', cell: SizeCell }
	] satisfies ColumnSpec<ImageSummaryDto>[];
</script>

{#snippet NameCell({ item }: { item: ImageSummaryDto })}
	<div class="flex items-center gap-2">
		<div class="flex flex-1 items-center">
			<a class="shrink truncate font-medium hover:underline" href="/images/{item.id}/">
				{#if item.repoTags && item.repoTags.length > 0 && item.repoTags[0] !== '<none>:<none>'}
					{item.repoTags[0].split(':')[0]}
				{:else}
					<span class="text-muted-foreground italic">Untagged</span>
				{/if}
			</a>
		</div>
	</div>
{/snippet}

{#snippet StatusCell({ item }: { item: ImageSummaryDto })}
	{#if item.inUse}
		<StatusBadge text="In Use" variant="green" />
	{:else}
		<StatusBadge text="Unused" variant="amber" />
	{/if}
{/snippet}

{#snippet TagCell({ item }: { item: ImageSummaryDto })}
	{#if item.repoTags && item.repoTags.length > 0 && item.repoTags[0] !== '<none>:<none>'}
		{item.repoTags[0].split(':')[1] || 'latest'}
	{:else}
		<span class="text-muted-foreground italic">&lt;none&gt;</span>
	{/if}
{/snippet}

{#snippet SizeCell({ item }: { item: ImageSummaryDto })}
	{bytes.format(item.size)}
{/snippet}

<Card.Root class="relative flex flex-col rounded-lg border shadow-sm">
	<Card.Header class="px-6 pb-3 pt-5">
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>
					<a class="font-medium hover:underline" href="/images">Images</a>
				</Card.Title>
				<Card.Description class="pb-2">Top 5 Largest Images</Card.Description>
			</div>
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="sm" href="/images" disabled={isLoading}>
					View All
					<ArrowRightIcon class="ml-2 size-4" />
				</Button>
			</div>
		</div>
	</Card.Header>
	<Card.Content class="flex-1 p-0">
		<div class="flex h-full flex-col">
			<ArcaneTable
				items={images}
				bind:requestOptions
				bind:selectedIds
				onRefresh={async (options) => (images = await environmentAPI.getImages(options))}
				withoutSearch={true}
				selectionDisabled={true}
				withoutPagination={true}
				{columns}
			/>
			{#if images.data.length > 5}
				<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
					Showing 5 of {images.pagination.totalItems} images
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
