<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { UniversalMobileCard } from '$lib/components/arcane-table/index.js';
	import BoxIcon from '@lucide/svelte/icons/box';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { containerService } from '$lib/services/container-service';
	import { goto } from '$app/navigation';

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
	<UniversalMobileCard
		{item}
		icon={(item) => {
			const state = item.state;
			return {
				component: BoxIcon,
				variant: state === 'running' ? 'emerald' : state === 'exited' ? 'red' : 'amber'
			};
		}}
		title={(item) => {
			if (item.names && item.names.length > 0) {
				return item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0];
			}
			return item.id.substring(0, 12);
		}}
		badges={[
			(item: ContainerSummaryDto) => ({
				variant: item.state === 'running' ? 'green' : item.state === 'exited' ? 'red' : 'amber',
				text: capitalizeFirstLetter(item.state)
			})
		]}
		fields={[
			{
				label: m.common_status(),
				getValue: (item: ContainerSummaryDto) => item.status,
				show: item.status !== undefined
			}
		]}
		compact
		class="mx-2"
		onclick={(item: ContainerSummaryDto) => goto(`/containers/${item.id}`)}
	/>
{/snippet}

<Card.Root class="pb-2">
	<Card.Header class="flex items-center justify-between p-4">
		<div>
			<Card.Title>
				{m.containers_title()}
			</Card.Title>
			<Card.Description>{m.containers_recent()}</Card.Description>
		</div>
		<Button variant="ghost" size="sm" href="/containers" disabled={isLoading}>
			{m.common_view_all()}
			<ArrowRightIcon class="ml-2 size-4" />
		</Button>
	</Card.Header>
	<Card.Content class="p-0 pt-2">
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
			<div class="bg-muted/40 text-muted-foreground border-t px-6 py-3 text-xs">
				{m.containers_showing_of_total({ shown: 5, total: containers.pagination.totalItems })}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
