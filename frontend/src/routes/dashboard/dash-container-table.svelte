<script lang="ts">
	import type { ContainerInfo, EnhancedContainerInfo } from '$lib/models/container-info';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowRight, Box, Loader2 } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter, truncateString } from '$lib/utils/string.utils';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';

	interface ContainerWithId extends ContainerInfo {
		id: string;
	}

	let {
		containers,
		isLoading,
		onRefresh,
		getContainerDisplayName
	}: {
		containers: ContainerInfo[];
		isLoading: boolean;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<Paginated<ContainerWithId>>;
		getContainerDisplayName: (container: ContainerInfo) => string;
	} = $props();

	let requestOptions = $state<SearchPaginationSortRequest>({
		pagination: { page: 1, limit: 5 },
		sort: { column: 'created', direction: 'desc' }
	});

	let selectedIds = $state<string[]>([]);

	const paginatedContainers: Paginated<ContainerWithId> = $derived({
		data: containers.slice(0, 5).map((c) => ({ ...c, id: c.Id })),
		pagination: {
			totalPages: Math.ceil(containers.length / 5),
			totalItems: containers.length,
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
					<a class="font-medium hover:underline" href="/containers">Containers</a>
				</Card.Title>
				<Card.Description class="pb-3">Recent containers</Card.Description>
			</div>
			<Button variant="ghost" size="sm" href="/containers" disabled={isLoading}>
				View All
				<ArrowRight class="ml-2 size-4" />
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="flex-1 p-0">
		{#if isLoading}
			<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
				<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
				<p class="text-lg font-medium">Loading Containers...</p>
				<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch containers</p>
			</div>
		{:else if containers?.length > 0}
			<div class="flex h-full flex-col">
				<ArcaneTable
					items={paginatedContainers}
					bind:requestOptions
					bind:selectedIds
					{onRefresh}
					withoutSearch={true}
					withoutPagination={true}
					selectionDisabled={true}
					columns={[
						{ label: 'Name', sortColumn: 'name' },
						{ label: 'Image', sortColumn: 'image' },
						{ label: 'State', sortColumn: 'state' },
						{ label: 'Status', sortColumn: 'status' }
					]}
					filterPlaceholder="Search containers..."
					noResultsMessage="No containers found"
				>
					{#snippet rows({ item })}
						{@const stateVariant = statusVariantMap[item.State?.toLowerCase()] || 'secondary'}
						<Table.Cell>
							<a class="font-medium hover:underline" href="/containers/{item.Id}/">
								{getContainerDisplayName(item)}
							</a>
						</Table.Cell>
						<Table.Cell title={item.Image}>
							{truncateString(item.Image, 40)}
						</Table.Cell>
						<Table.Cell>
							<StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.State)} />
						</Table.Cell>
						<Table.Cell>{item.Status}</Table.Cell>
					{/snippet}
				</ArcaneTable>
				{#if containers.length > 5}
					<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
						Showing 5 of {containers.length} containers
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center px-6 py-10 text-center">
				<Box class="text-muted-foreground mb-2 size-8 opacity-40" />
				<p class="text-muted-foreground text-sm">No containers found</p>
				<p class="text-muted-foreground mt-1 text-xs">
					Use Docker CLI or another tool to create containers
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
