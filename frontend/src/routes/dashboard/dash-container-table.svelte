<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import { environmentAPI } from '$lib/services/api';
	import type { ColumnSpec } from '$lib/components/arcane-table';

	let {
		containers = $bindable(),
		isLoading
	}: {
		containers: Paginated<ContainerSummaryDto>;
		isLoading: boolean;
	} = $props();

	let selectedIds = $state<string[]>([]);

	let requestOptions = $state<SearchPaginationSortRequest>({
		pagination: { page: 1, limit: 5 },
		sort: { column: 'created', direction: 'desc' }
	});

	const columns = [
		{ accessorKey: 'names', title: 'Name', cell: NameCell },
		{ accessorKey: 'image', title: 'Image' },
		{ accessorKey: 'state', title: 'State', cell: StateCell },
		{ accessorKey: 'status', title: 'Status' }
	] satisfies ColumnSpec<ContainerSummaryDto>[];
</script>

{#snippet NameCell({ item }: { item: ContainerSummaryDto })}
	<a class="font-medium hover:underline" href="/containers/{item.id}/">
		{#if item.names && item.names.length > 0}
			{item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0]}
		{:else}
			{item.id.substring(0, 12)}
		{/if}
	</a>
{/snippet}

{#snippet StateCell({ item }: { item: ContainerSummaryDto })}
	{@const stateVariant = getStatusVariant(item.state)}
	<StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.state)} />
{/snippet}

<Card.Root class="relative flex flex-col rounded-lg border shadow-sm">
	<Card.Header class="px-6 pb-3 pt-5">
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>
					<a class="font-medium hover:underline" href="/containers">Containers</a>
				</Card.Title>
				<Card.Description class="pb-2">Recent containers</Card.Description>
			</div>
			<Button variant="ghost" size="sm" href="/containers" disabled={isLoading}>
				View All
				<ArrowRightIcon class="ml-2 size-4" />
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="flex-1 p-0">
		<div class="flex h-full flex-col">
			<ArcaneTable
				items={containers}
				bind:requestOptions
				bind:selectedIds
				onRefresh={async (options) => (containers = await environmentAPI.getContainers(options))}
				withoutSearch={true}
				withoutPagination={true}
				selectionDisabled={true}
				{columns}
			/>
			{#if containers.data.length > 5}
				<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
					Showing 5 of {containers.pagination.totalItems} containers
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
