<script lang="ts">
	import type { NetworkSummary } from '$lib/types/network.type';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScanSearch, Trash2, Ellipsis, Network } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { environmentAPI } from '$lib/services/api';
	import { DEFAULT_NETWORK_NAMES } from '$lib/constants';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { formatFriendlyDate } from '$lib/utils/date.utils';

	interface NetworkWithId extends NetworkSummary {
		id: string;
	}

	let {
		networks,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onNetworksChanged,
		onCreateNetwork
	}: {
		networks: Paginated<NetworkSummary>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<Paginated<NetworkSummary>>;
		onNetworksChanged: () => Promise<void>;
		onCreateNetwork: () => void;
	} = $props();

	let isLoading = $state({
		remove: false
	});

	const transformedNetworks = $derived.by(() => {
		const transformed: NetworkWithId[] = networks.data.map((network) => ({
			...network,
			id: network.ID
		}));

		return {
			data: transformed,
			pagination: networks.pagination
		};
	});

	async function handleRefresh(
		options: SearchPaginationSortRequest
	): Promise<Paginated<NetworkWithId>> {
		const result = await onRefresh(options);
		const transformed: NetworkWithId[] = result.data.map((network) => ({
			...network,
			id: network.ID
		}));

		return {
			data: transformed,
			pagination: result.pagination
		};
	}

	async function handleDeleteNetwork(id: string, name: string) {
		if (DEFAULT_NETWORK_NAMES.has(name)) {
			toast.error(`Cannot delete default network: ${name}`);
			return;
		}
		openConfirmDialog({
			title: 'Delete Network',
			message: `Are you sure you want to delete network "${name}"? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteNetwork(id)),
						message: `Failed to Remove Network "${name}"`,
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(`Network "${name}" Removed Successfully.`);
							await onNetworksChanged();
						}
					});
				}
			}
		});
	}

	async function handleDeleteSelectedNetworks() {
		const selectedNetworkList = networks.data.filter((network) => selectedIds.includes(network.ID));
		const defaultNetworks = selectedNetworkList.filter((network) =>
			DEFAULT_NETWORK_NAMES.has(network.Name)
		);

		if (defaultNetworks.length > 0) {
			toast.error(
				`Cannot delete default networks: ${defaultNetworks.map((n) => n.Name).join(', ')}`
			);
			return;
		}

		openConfirmDialog({
			title: 'Delete Selected Networks',
			message: `Are you sure you want to delete ${selectedIds.length} selected network(s)? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.remove = true;

					let successCount = 0;
					let failureCount = 0;

					for (const networkId of selectedIds) {
						const network = networks.data.find((n) => n.ID === networkId);
						if (!network) continue;

						const result = await tryCatch(environmentAPI.deleteNetwork(networkId));
						if (result.error) {
							failureCount++;
							toast.error(`Failed to delete network "${network.Name}": ${result.error.message}`);
						} else {
							successCount++;
							toast.success(`Network "${network.Name}" deleted successfully.`);
						}
					}

					isLoading.remove = false;
					if (successCount > 0) {
						setTimeout(async () => {
							await onNetworksChanged();
						}, 500);
					}
					selectedIds = [];
				}
			}
		});
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	const hasNetworks = $derived(networks?.data?.length > 0);

	const getConnectedContainers = (network: NetworkWithId) => {
		return network.Containers ? Object.keys(network.Containers).length : 0;
	};
</script>

{#if hasNetworks}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Network List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedIds.length > 0}
						<ArcaneButton
							action="remove"
							onClick={handleDeleteSelectedNetworks}
							loading={isLoading.remove}
							disabled={isLoading.remove}
							label="Delete Selected"
						/>
					{/if}
					<ArcaneButton action="create" label="Create Network" onClick={onCreateNetwork} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={transformedNetworks}
				bind:requestOptions
				bind:selectedIds
				onRefresh={handleRefresh}
				columns={[
					{ label: 'Name', sortColumn: 'Name' },
					{ label: 'Network ID', sortColumn: 'ID' },
					{ label: 'Driver', sortColumn: 'Driver' },
					{ label: 'Scope', sortColumn: 'Scope' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search networks..."
				noResultsMessage="No networks found"
			>
				{#snippet rows({ item })}
					<Table.Cell>
						<a class="font-medium hover:underline" href="/networks/{item.ID}/">{item.Name}</a>
					</Table.Cell>
					<Table.Cell class="truncate font-mono text-sm">{item.ID}</Table.Cell>
					<Table.Cell>
						<StatusBadge
							variant={item.Driver === 'bridge'
								? 'blue'
								: item.Driver === 'overlay'
									? 'purple'
									: 'gray'}
							text={item.Driver}
						/>
					</Table.Cell>
					<Table.Cell>
						<StatusBadge variant={item.Scope === 'local' ? 'green' : 'amber'} text={item.Scope} />
					</Table.Cell>
					<Table.Cell>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
										<span class="sr-only">Open menu</span>
										<Ellipsis />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Group>
									<DropdownMenu.Item
										onclick={() => goto(`/networks/${item.ID}`)}
										disabled={isAnyLoading}
									>
										<ScanSearch class="size-4" />
										Inspect
									</DropdownMenu.Item>
									{#if !DEFAULT_NETWORK_NAMES.has(item.Name)}
										<DropdownMenu.Item
											variant="destructive"
											onclick={() => handleDeleteNetwork(item.ID, item.Name)}
											disabled={DEFAULT_NETWORK_NAMES.has(item.Name) || isAnyLoading}
										>
											<Trash2 class="size-4" />
											Remove
										</DropdownMenu.Item>
									{/if}
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Table.Cell>
				{/snippet}
			</ArcaneTable>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<Network class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No networks found</p>
		<p class="text-muted-foreground mt-1 text-sm">
			Create a new network using the "Create Network" button above or use the Docker CLI
		</p>
	</div>
{/if}
