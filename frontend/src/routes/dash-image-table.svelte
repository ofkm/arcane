<script lang="ts">
	import type { EnhancedImageInfo } from '$lib/models/image.type';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowRight, HardDrive, Loader2 } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import MaturityItem from '$lib/components/maturity-item.svelte';
	import { formatBytes } from '$lib/utils/bytes.util';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';

	interface ImageWithId extends EnhancedImageInfo {
		id: string;
	}

	let {
		images,
		isLoading,
		isLoadingMaturity,
		onRefresh
	}: {
		images: EnhancedImageInfo[];
		isLoading: boolean;
		isLoadingMaturity: boolean;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<Paginated<ImageWithId>>;
	} = $props();

	let requestOptions = $state<SearchPaginationSortRequest>({
		pagination: { page: 1, limit: 5 },
		sort: { column: 'Size', direction: 'desc' }
	});

	let selectedIds = $state<string[]>([]);

	const sortedImages = $derived(
		images
			.slice()
			.sort((a, b) => (b.Size || 0) - (a.Size || 0))
			.slice(0, 5)
	);

	const paginatedImages: Paginated<ImageWithId> = $derived({
		data: sortedImages.map((img) => ({ ...img, id: img.Id })),
		pagination: {
			totalPages: Math.ceil(images.length / 5),
			totalItems: images.length,
			currentPage: 1,
			itemsPerPage: 5
		}
	});
</script>

<Card.Root class="relative flex flex-col border shadow-sm">
	<Card.Header class="px-6">
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>
					<a class="font-medium hover:underline" href="/images">Images</a>
				</Card.Title>
				<Card.Description class="pb-3">Top 5 Largest Images</Card.Description>
			</div>
			<Button variant="ghost" size="sm" href="/images" disabled={isLoading}>
				View All
				<ArrowRight class="ml-2 size-4" />
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="flex-1 p-0">
		{#if isLoading}
			<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
				<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
				<p class="text-lg font-medium">Loading Images...</p>
				<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch images</p>
			</div>
		{:else if images?.length > 0}
			<div class="flex h-full flex-col">
				<ArcaneTable
					items={paginatedImages}
					bind:requestOptions
					bind:selectedIds
					{onRefresh}
					withoutSearch={true}
					selectionDisabled={true}
					withoutPagination={true}
					columns={[
						{ label: 'Name', sortColumn: 'RepoTags' },
						{ label: 'Status', sortColumn: 'InUse' },
						{ label: 'Tag', sortColumn: 'tag' },
						{ label: 'Size', sortColumn: 'Size' }
					]}
					filterPlaceholder="Search images..."
					noResultsMessage="No images found"
				>
					{#snippet rows({ item })}
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div class="flex flex-1 items-center">
									{#if isLoadingMaturity}
										<div class="bg-muted size-4 animate-pulse rounded-full mr-2"></div>
									{:else}
										<MaturityItem
											maturity={item.maturity}
											isLoadingInBackground={!item.maturity}
											imageId={item.Id}
										/>
									{/if}
									<a class="shrink truncate font-medium hover:underline" href="/images/{item.Id}/">
										{#if item.RepoTags && item.RepoTags.length > 0 && item.RepoTags[0] !== '<none>:<none>'}
											{item.RepoTags[0].split(':')[0]}
										{:else}
											<span class="text-muted-foreground italic">Untagged</span>
										{/if}
									</a>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if item.InUse}
								<StatusBadge text="In Use" variant="green" />
							{:else}
								<StatusBadge text="Unused" variant="amber" />
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if item.RepoTags && item.RepoTags.length > 0 && item.RepoTags[0] !== '<none>:<none>'}
								{item.RepoTags[0].split(':')[1] || 'latest'}
							{:else}
								<span class="text-muted-foreground italic">&lt;none&gt;</span>
							{/if}
						</Table.Cell>
						<Table.Cell>{formatBytes(item.Size || 0)}</Table.Cell>
					{/snippet}
				</ArcaneTable>
				{#if images.length > 5}
					<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
						Showing 5 of {images.length} images
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center px-6 py-10 text-center">
				<HardDrive class="text-muted-foreground mb-2 size-8 opacity-40" />
				<p class="text-muted-foreground text-sm">No images found</p>
				<p class="text-muted-foreground mt-1 text-xs">
					Pull images using Docker CLI or another tool
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
