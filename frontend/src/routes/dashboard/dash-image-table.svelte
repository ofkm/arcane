<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import bytes from 'bytes';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { UniversalMobileCard } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { imageService } from '$lib/services/image-service';
	import { goto } from '$app/navigation';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';

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
		{ accessorKey: 'repoTags', title: m.images_repository(), cell: NameCell },
		{ accessorKey: 'inUse', title: m.common_status(), cell: StatusCell },
		{ id: 'tag', title: m.images_tag(), cell: TagCell },
		{ accessorKey: 'size', title: m.common_size(), cell: SizeCell }
	] satisfies ColumnSpec<ImageSummaryDto>[];
</script>

{#snippet NameCell({ item }: { item: ImageSummaryDto })}
	<div class="flex items-center gap-2">
		<div class="flex flex-1 items-center">
			<a class="shrink truncate font-medium hover:underline" href="/images/{item.id}">
				{#if item.repo && item.repo !== '<none>'}
					{item.repo}
				{:else}
					<span class="text-muted-foreground italic">{m.images_untagged()}</span>
				{/if}
			</a>
		</div>
	</div>
{/snippet}

{#snippet StatusCell({ item }: { item: ImageSummaryDto })}
	{#if item.inUse}
		<StatusBadge text={m.common_in_use()} variant="green" />
	{:else}
		<StatusBadge text={m.common_unused()} variant="amber" />
	{/if}
{/snippet}

{#snippet TagCell({ item }: { item: ImageSummaryDto })}
	{#if item.tag && item.tag !== '<none>'}
		{item.tag}
	{:else}
		<span class="text-muted-foreground italic">{m.images_none_label()}</span>
	{/if}
{/snippet}

{#snippet SizeCell({ item }: { item: ImageSummaryDto })}
	{bytes.format(item.size)}
{/snippet}

{#snippet DashImageMobileCard({ row, item }: { row: any; item: ImageSummaryDto })}
	<UniversalMobileCard
		{item}
		icon={(item: ImageSummaryDto) => ({
			component: HardDriveIcon,
			variant: item.inUse ? 'emerald' : 'amber'
		})}
		title={(item: ImageSummaryDto) => {
			if (item.repo && item.repo !== '<none>') {
				return item.repo;
			}
			return m.images_untagged();
		}}
		badges={[
			(item: ImageSummaryDto) =>
				item.inUse ? { variant: 'green', text: m.common_in_use() } : { variant: 'amber', text: m.common_unused() }
		]}
		fields={[
			{
				label: m.common_size(),
				getValue: (item: ImageSummaryDto) => bytes.format(item.size)
			}
		]}
		compact
		onclick={(item: ImageSummaryDto) => goto(`/images/${item.id}`)}
	/>
{/snippet}

<Card.Root class="flex h-full min-h-0 flex-col">
	<Card.Header icon={HardDriveIcon} class="shrink-0">
		<div class="flex flex-1 items-center justify-between">
			<div class="flex flex-col space-y-1.5">
				<Card.Title>
					<h2><a class="hover:underline" href="/images">{m.images_title()}</a></h2>
				</Card.Title>
				<Card.Description>{m.images_top_largest()}</Card.Description>
			</div>
			<Button variant="ghost" size="sm" href="/images" disabled={isLoading}>
				{m.common_view_all()}
				<ArrowRightIcon class="ml-2 size-4" />
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="relative flex min-h-0 flex-1 flex-col px-0">
		<ArcaneTable
			items={images}
			bind:requestOptions
			bind:selectedIds
			onRefresh={async (options) => (images = await imageService.getImages(options))}
			withoutSearch={true}
			selectionDisabled={true}
			withoutPagination={true}
			unstyled={true}
			{columns}
			mobileCard={DashImageMobileCard}
		/>
		{#if images.data.length > 5}
			<div
				class="bg-muted/40 text-muted-foreground absolute right-0 bottom-0 left-0 rounded-b-xl px-6 py-3 text-xs backdrop-blur-sm"
			>
				{m.images_showing_of_total({ shown: 5, total: images.pagination.totalItems })}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
