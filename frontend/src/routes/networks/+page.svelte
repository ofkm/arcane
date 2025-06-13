<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus, AlertCircle, Network, Trash2, Loader2, ScanSearch, Ellipsis } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import type { PageData } from './$types';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import CreateNetworkSheet from '$lib/components/sheets/create-network-sheet.svelte';
	import * as Table from '$lib/components/ui/table';
	import type { NetworkCreateOptions, NetworkInspectInfo } from 'dockerode';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { networkAPI } from '$lib/services/api';
	import { DEFAULT_NETWORK_NAMES } from '$lib/constants';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';

	let { data }: { data: PageData } = $props();

	let networkPageStates = $state({
		networks: data.networks as NetworkInspectInfo[],
		selectedNetworks: <string[]>[],
		error: data.error,
		isCreateDialogOpen: false
	});

	let isLoading = $state({
		create: false,
		remove: false,
		refresh: false
	});

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	$effect(() => {
		networkPageStates.networks = data.networks as NetworkInspectInfo[];
		networkPageStates.error = data.error;
	});

	const totalNetworks = $derived(networkPageStates.networks.length);
	// NetworkInfo uses 'Driver' (capital D)
	const bridgeNetworks = $derived(networkPageStates.networks.filter((n) => n.Driver === 'bridge').length);
	const overlayNetworks = $derived(networkPageStates.networks.filter((n) => n.Driver === 'overlay').length);

	async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
		handleApiResultWithCallbacks({
			result: await tryCatch(networkAPI.create(options)),
			message: `Failed to Create Network "${options.Name}"`,
			setLoadingState: (value) => (isLoading.create = value),
			onSuccess: async () => {
				toast.success(`Network "${options.Name}" Created Successfully.`);
				await invalidateAll();
				networkPageStates.isCreateDialogOpen = false;
			}
		});
	}

	async function handleDeleteNetwork(id: string, name: string) {
		if (DEFAULT_NETWORK_NAMES.has(name)) {
			toast.error(`Cannot delete default network: ${name}`);
			return;
		}
		openConfirmDialog({
			title: 'Delete Network',
			message: `Are you sure you want to delete network "${name}" (ID: ${id.substring(0, 12)})? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(networkAPI.remove(encodeURIComponent(id))),
						message: `Failed to Remove Network "${name}"`,
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(`Network "${name}" Removed Successfully.`);
							await invalidateAll();
						}
					});
				}
			}
		});
	}

	async function handleDeleteSelected() {
		const selectedNetworkDetails = networkPageStates.selectedNetworks.map((id) => {
			const network = networkPageStates.networks.find((n) => n.Id === id);
			return {
				id,
				name: network?.Name || id.substring(0, 12),
				isDefault: DEFAULT_NETWORK_NAMES.has(network?.Name || '')
			};
		});

		const defaultNetworksSelected = selectedNetworkDetails.filter((n) => n.isDefault);

		if (defaultNetworksSelected.length > 0) {
			const names = defaultNetworksSelected.map((n) => n.name).join(', ');
			toast.error(`Cannot delete default networks: ${names}. Please deselect them.`);
			return;
		}

		openConfirmDialog({
			title: 'Delete Selected Networks',
			message: `Are you sure you want to delete ${networkPageStates.selectedNetworks.length} selected network(s)? This action cannot be undone. Networks currently in use by containers cannot be deleted.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.remove = true;
					let successCount = 0;
					let failureCount = 0;

					for (const network of selectedNetworkDetails) {
						// Iterate over details which includes name
						const result = await tryCatch(networkAPI.remove(encodeURIComponent(network.id)));
						// The setLoadingState in a loop like this will just toggle the global remove state
						// For individual item loading, a more complex state management would be needed.
						if (result.data) {
							toast.success(`Network "${network.name}" deleted successfully.`);
							successCount++;
						} else if (result.error) {
							const error = result.error as any;
							toast.error(`Failed to delete network "${network.name}": ${error.message || 'Unknown error'}`);
							failureCount++;
						}
					}
					isLoading.remove = false; // Reset after all operations

					console.log(`Finished deleting. Success: ${successCount}, Failed: ${failureCount}`);
					if (successCount > 0) {
						setTimeout(async () => {
							await invalidateAll();
						}, 500); // Delay to allow toasts to show before list updates
					}
					networkPageStates.selectedNetworks = []; // Clear selection
				}
			}
		});
	}

	function getNetworkSubnet(network: NetworkInspectInfo): string {
		if (network.IPAM && network.IPAM.Config && network.IPAM.Config.length > 0 && network.IPAM.Config[0].Subnet) {
			return network.IPAM.Config[0].Subnet;
		}
		return 'N/A';
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Networks</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage Container Networking</p>
		</div>
	</div>

	{#if networkPageStates.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Error Loading Networks</Alert.Title>
			<Alert.Description>{networkPageStates.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Networks</p>
					<p class="text-2xl font-bold">{totalNetworks}</p>
				</div>
				<div class="bg-primary/10 rounded-full p-2">
					<Network class="text-primary size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Bridge Networks</p>
					<p class="text-2xl font-bold">{bridgeNetworks}</p>
				</div>
				<div class="rounded-full bg-blue-500/10 p-2">
					<Network class="size-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Overlay Networks</p>
					<p class="text-2xl font-bold">{overlayNetworks}</p>
				</div>
				<div class="rounded-full bg-purple-500/10 p-2">
					<Network class="size-5 text-purple-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Network List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					{#if networkPageStates.selectedNetworks.length > 0}
						<ArcaneButton action="remove" customLabel="Delete Selected ({networkPageStates.selectedNetworks.length})" onClick={() => handleDeleteSelected()} loading={isLoading.remove} loadingLabel="Processing..." disabled={isLoading.remove} />
					{/if}
					<ArcaneButton action="create" customLabel="Create Network" onClick={() => (networkPageStates.isCreateDialogOpen = true)} disabled={isLoading.create} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if networkPageStates.networks && networkPageStates.networks.length > 0}
				<UniversalTable
					data={networkPageStates.networks}
					columns={[
						{ accessorKey: 'Name', header: 'Name' },
						{ accessorKey: 'Driver', header: 'Driver' },
						{ accessorKey: 'Scope', header: 'Scope' },
						{ accessorFn: (row) => getNetworkSubnet(row), header: 'Subnet', id: 'subnet' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					idKey="Id"
					display={{
						filterPlaceholder: 'Search networks...',
						noResultsMessage: 'No networks found'
					}}
					pagination={{
						pageSize: tablePersistence.getPageSize('networks')
					}}
					onPageSizeChange={(newSize) => {
						tablePersistence.setPageSize('networks', newSize);
					}}
					sort={{
						defaultSort: { id: 'Name', desc: false }
					}}
					bind:selectedIds={networkPageStates.selectedNetworks}
				>
					{#snippet rows({ item }: { item: NetworkInspectInfo })}
						{@const isDefaultNetwork = DEFAULT_NETWORK_NAMES.has(item.Name)}
						<Table.Cell><a class="font-medium hover:underline" href="/networks/{encodeURIComponent(item.Id)}/">{item.Name}</a></Table.Cell>
						<Table.Cell>{item.Driver}</Table.Cell>
						<Table.Cell>{item.Scope}</Table.Cell>
						<Table.Cell>{getNetworkSubnet(item)}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/networks/${encodeURIComponent(item.Id)}`)} disabled={isAnyLoading}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										{#if !isDefaultNetwork}
											<DropdownMenu.Separator />
											<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => handleDeleteNetwork(item.Id, item.Name)} disabled={isLoading.remove || isAnyLoading}>
												{#if isLoading.remove && networkPageStates.selectedNetworks.includes(item.Id)}
													<Loader2 class="size-4 animate-spin" />
												{:else}
													<Trash2 class="size-4" />
												{/if}
												Remove
											</DropdownMenu.Item>
										{/if}
									</DropdownMenu.Group>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					{/snippet}
				</UniversalTable>
			{:else if !networkPageStates.error}
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<Network class="text-muted-foreground mb-4 size-12 opacity-40" />
					<p class="text-lg font-medium">No networks found</p>
					<p class="text-muted-foreground mt-1 max-w-md text-sm">Create a new network using the "Create Network" button above or use the Docker CLI</p>
					<div class="mt-4 flex gap-3">
						<ArcaneButton action="create" customLabel="Create Network" onClick={() => (networkPageStates.isCreateDialogOpen = true)} size="sm" />
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<CreateNetworkSheet bind:open={networkPageStates.isCreateDialogOpen} isLoading={isLoading.create} onSubmit={handleCreateNetworkSubmit} />
</div>
