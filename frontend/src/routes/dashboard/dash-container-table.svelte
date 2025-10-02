<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { ContainerMobileCard } from '$lib/components/arcane-table/index.js';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { containerService } from '$lib/services/container-service';

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
		{ accessorKey: 'names', title: m.common_name(), cell: NameCell },
		{ accessorKey: 'image', title: m.common_image() },
		{ accessorKey: 'state', title: m.common_state(), cell: StateCell },
		{ accessorKey: 'status', title: m.common_status() }
	] satisfies ColumnSpec<ContainerSummaryDto>[];
</script>

{#snippet NameCell({ item }: { item: ContainerSummaryDto })}
	<a class="font-medium hover:underline" href="/containers/{item.id}">
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

{#snippet DashContainerMobileCard({ row, item }: { row: any; item: ContainerSummaryDto })}
	<ContainerMobileCard
		{item}
		compact
		showNetwork={false}
		showPorts={false}
		showStatus={false}
		showMounts={false}
		onclick={(item: ContainerSummaryDto) => (window.location.href = `/containers/${item.id}/`)}
		class="mx-2"
	/>
{/snippet}

<Card.Root class="relative flex flex-col gap-6 rounded-lg border py-3 shadow-sm">
	<Card.Header
		class="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-5 pb-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6"
	>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>
					<a class="font-medium hover:underline" href="/containers">{m.containers_title()}</a>
				</Card.Title>
				<Card.Description class="pb-2">{m.containers_recent()}</Card.Description>
			</div>
			<Button variant="ghost" size="sm" href="/containers" disabled={isLoading}>
				{m.common_view_all()}
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
				onRefresh={async (options) => (containers = await containerService.getContainers(options))}
				withoutSearch={true}
				withoutPagination={true}
				selectionDisabled={true}
				{columns}
				mobileCard={DashContainerMobileCard}
			/>
			{#if containers.data.length > 5}
				<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
					{m.containers_showing_of_total({ shown: 5, total: containers.pagination.totalItems })}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
