<script lang="ts">
	import type { NetworkSummaryDto } from '$lib/types/network.type';
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { DEFAULT_NETWORK_NAMES } from '$lib/constants';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { networkService } from '$lib/services/network-service';

	let {
		networks = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		networks: Paginated<NetworkSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
	} = $props();

	let isLoading = $state({
		remove: false
	});

	async function handleDeleteNetwork(id: string, name: string) {
		const safeName = name?.trim() || m.common_unknown();
		if (DEFAULT_NETWORK_NAMES.has(name)) {
			toast.error(m.networks_cannot_delete_default({ name: safeName }));
			return;
		}
		openConfirmDialog({
			title: m.networks_delete_title(),
			message: m.networks_delete_confirm_message({ name: safeName }),
			confirm: {
				label: m.common_delete(),
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(networkService.deleteNetwork(id)),
						message: m.networks_delete_failed({ name: safeName }),
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(m.networks_delete_success({ name: safeName }));
							networks = await networkService.getNetworks(requestOptions);
						}
					});
				}
			}
		});
	}

	async function handleDeleteSelectedNetworks(ids: string[]) {
		const selectedNetworkList = networks.data.filter((n) => ids.includes(n.id));
		const defaultNetworks = selectedNetworkList.filter((n) => DEFAULT_NETWORK_NAMES.has(n.name));

		if (defaultNetworks.length > 0) {
			const names = defaultNetworks.map((n) => n.name ?? m.common_unknown()).join(', ');
			toast.error(m.networks_cannot_delete_default_many({ names }));
			return;
		}

		openConfirmDialog({
			title: m.networks_delete_selected_title({ count: ids.length }),
			message: m.networks_delete_selected_message({ count: ids.length }),
			confirm: {
				label: m.common_delete(),
				destructive: true,
				action: async () => {
					isLoading.remove = true;
					let successCount = 0;
					let failureCount = 0;

					for (const networkId of ids) {
						const network = networks.data.find((n) => n.id === networkId);
						if (!network) continue;

						const result = await tryCatch(networkService.deleteNetwork(networkId));
						if (result.error) {
							failureCount++;
							toast.error(m.networks_delete_failed({ name: network.name ?? m.common_unknown() }));
						} else {
							successCount++;
							toast.success(m.networks_delete_success({ name: network.name ?? m.common_unknown() }));
						}
					}

					isLoading.remove = false;

					if (successCount > 0) {
						networks = await networkService.getNetworks(requestOptions);
					}
					selectedIds = [];
				}
			}
		});
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((l) => l));
	const hasNetworks = $derived(networks?.data?.length > 0);

	const columns = [
		{
			accessorKey: 'name',
			title: m.common_name(),
			sortable: true,
			cell: NameCell
		},
		{
			accessorKey: 'id',
			title: m.common_id(),
			cell: IdCell
		},
		{
			accessorKey: 'inUse',
			title: m.common_status(),
			sortable: true,
			cell: StatusCell
		},
		{
			accessorKey: 'driver',
			title: m.common_driver(),
			sortable: true,
			cell: DriverCell
		},
		{
			accessorKey: 'scope',
			title: m.common_scope(),
			sortable: true,
			cell: ScopeCell
		}
	] satisfies ColumnSpec<NetworkSummaryDto>[];
</script>

{#snippet NameCell({ item }: { item: NetworkSummaryDto })}
	<a class="font-medium hover:underline" href="/networks/{item.id}/">{item.name}</a>
{/snippet}

{#snippet IdCell({ value }: { value: unknown })}
	<span class="truncate font-mono text-sm">{String(value ?? '')}</span>
{/snippet}

{#snippet DriverCell({ item }: { item: NetworkSummaryDto })}
	<StatusBadge
		variant={item.driver === 'bridge'
			? 'blue'
			: item.driver === 'overlay'
				? 'purple'
				: item.driver === 'ipvlan'
					? 'red'
					: item.driver === 'macvlan'
						? 'orange'
						: 'gray'}
		text={capitalizeFirstLetter(item.driver)}
	/>
{/snippet}

{#snippet ScopeCell({ item }: { item: NetworkSummaryDto })}
	<StatusBadge variant={item.scope === 'local' ? 'green' : 'amber'} text={capitalizeFirstLetter(item.scope)} />
{/snippet}

{#snippet StatusCell({ item }: { item: NetworkSummaryDto })}
	{#if item.inUse}
		<StatusBadge text={m.common_in_use()} variant="green" />
	{:else}
		<StatusBadge text={m.common_unused()} variant="amber" />
	{/if}
{/snippet}

{#snippet RowActions({ item }: { item: NetworkSummaryDto })}
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
				<DropdownMenu.Item onclick={() => goto(`/networks/${item.id}`)} disabled={isAnyLoading}>
					<ScanSearchIcon class="size-4" />
					{m.common_inspect()}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item
					variant="destructive"
					onclick={() => handleDeleteNetwork(item.id, item.name)}
					disabled={isAnyLoading || DEFAULT_NETWORK_NAMES.has(item.name)}
				>
					<Trash2Icon class="size-4" />
					{m.common_delete()}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root>
	<Card.Content class="py-5">
		<ArcaneTable
			persistKey="arcane-networks-table"
			items={networks}
			bind:requestOptions
			bind:selectedIds
			onRemoveSelected={(ids) => handleDeleteSelectedNetworks(ids)}
			onRefresh={async (options) => (networks = await networkService.getNetworks(options))}
			{columns}
			rowActions={RowActions}
		/>
	</Card.Content>
</Card.Root>
