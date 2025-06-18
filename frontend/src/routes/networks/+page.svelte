<script lang="ts">
	import { Trash2, Plus, Network, Ellipsis, ScanSearch } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import type { PageData } from './$types';
	import type { NetworkCreateOptions } from 'dockerode';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateNetworkSheet from '$lib/components/sheets/create-network-sheet.svelte';
	import { environmentAPI } from '$lib/services/api';
	import { DEFAULT_NETWORK_NAMES } from '$lib/constants';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';

	let { data }: { data: PageData } = $props();

	let networkPageStates = $state({
		networks: Array.isArray(data.networks) ? data.networks : [],
		selectedNetworks: <string[]>[],
		error: data.error,
		isCreateDialogOpen: false
	});

	let isLoading = $state({
		create: false,
		remove: false,
		refresh: false
	});

	$effect(() => {
		networkPageStates.networks = Array.isArray(data.networks) ? data.networks : [];
		networkPageStates.error = data.error;
	});

	const totalNetworks = $derived(networkPageStates.networks.length);
	const bridgeNetworks = $derived(networkPageStates.networks.filter((n) => n.Driver === 'bridge').length);
	const overlayNetworks = $derived(networkPageStates.networks.filter((n) => n.Driver === 'overlay').length);

	async function refreshNetworks() {
		isLoading.refresh = true;
		try {
			const refreshedNetworks = await environmentAPI.getNetworks();
			networkPageStates.networks = Array.isArray(refreshedNetworks) ? refreshedNetworks : [];
		} catch (error) {
			console.error('Failed to refresh networks:', error);
			toast.error('Failed to refresh networks');
		} finally {
			isLoading.refresh = false;
		}
	}

	async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
		isLoading.create = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createNetwork(options)),
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
							await invalidateAll();
						}
					});
				}
			}
		});
	}

	async function handleDeleteSelectedNetworks() {
		const selectedNetworks = networkPageStates.networks.filter((network) => networkPageStates.selectedNetworks.includes(network.Id));
		const defaultNetworks = selectedNetworks.filter((network) => DEFAULT_NETWORK_NAMES.has(network.Name));

		if (defaultNetworks.length > 0) {
			toast.error(`Cannot delete default networks: ${defaultNetworks.map((n) => n.Name).join(', ')}`);
			return;
		}

		openConfirmDialog({
			title: 'Delete Selected Networks',
			message: `Are you sure you want to delete ${networkPageStates.selectedNetworks.length} selected network(s)? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.remove = true;

					let successCount = 0;
					let failureCount = 0;

					for (const networkId of networkPageStates.selectedNetworks) {
						const network = networkPageStates.networks.find((n) => n.Id === networkId);
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
							await invalidateAll();
						}, 500);
					}
					networkPageStates.selectedNetworks = [];
				}
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Networks</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage your Docker networks</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton action="restart" onClick={refreshNetworks} loading={isLoading.refresh} disabled={isLoading.refresh} />
		</div>
	</div>

	{#if networkPageStates.error}
		<Alert.Root variant="destructive">
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
				<div class="rounded-full bg-blue-500/10 p-2">
					<Network class="size-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Bridge Networks</p>
					<p class="text-2xl font-bold">{bridgeNetworks}</p>
				</div>
				<div class="rounded-full bg-green-500/10 p-2">
					<Network class="size-5 text-green-500" />
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

	{#if networkPageStates.networks && networkPageStates.networks.length > 0}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<Card.Title>Network List</Card.Title>
					<div class="flex items-center gap-2">
						{#if networkPageStates.selectedNetworks.length > 0}
							<ArcaneButton action="remove" onClick={handleDeleteSelectedNetworks} loading={isLoading.remove} disabled={isLoading.remove} />
						{/if}
						<ArcaneButton action="create" label="Create Network" onClick={() => (networkPageStates.isCreateDialogOpen = true)} loading={isLoading.create} disabled={isLoading.create} />
					</div>
				</div>
			</Card.Header>

			<Card.Content>
				<UniversalTable
					data={networkPageStates.networks}
					columns={[
						{ accessorKey: 'Name', header: 'Name' },
						{ accessorKey: 'Id', header: 'Network ID', enableSorting: false },
						{ accessorKey: 'Driver', header: 'Driver' },
						{ accessorKey: 'Scope', header: 'Scope' },
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
					{#snippet rows({ item })}
						<Table.Cell>
							<a class="font-medium hover:underline" href="/networks/{item.Id}/">{item.Name}</a>
						</Table.Cell>
						<Table.Cell class="truncate font-mono text-sm">{item.Id}</Table.Cell>
						<Table.Cell>{item.Driver}</Table.Cell>
						<Table.Cell>{item.Scope}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/networks/${item.Id}`)}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item class="focus:text-red-700! text-red-500" onclick={() => handleDeleteNetwork(item.Id, item.Name)} disabled={DEFAULT_NETWORK_NAMES.has(item.Name)}>
											<Trash2 class="size-4" />
											Remove
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					{/snippet}
				</UniversalTable>
			</Card.Content>
		</Card.Root>
	{:else if !networkPageStates.error}
		<div class="bg-card flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center">
			<Network class="text-muted-foreground mb-4 size-12 opacity-40" />
			<p class="text-lg font-medium">No networks found</p>
			<p class="text-muted-foreground mt-1 max-w-md text-sm">Create a new network using the "Create Network" button above or use the Docker CLI</p>
			<div class="mt-4 flex gap-3">
				<Button variant="outline" size="sm" onclick={() => (networkPageStates.isCreateDialogOpen = true)}>
					<Plus class="size-4" />
					Create Network
				</Button>
			</div>
		</div>
	{/if}

	<CreateNetworkSheet bind:open={networkPageStates.isCreateDialogOpen} isLoading={isLoading.create} onSubmit={handleCreateNetworkSubmit} />
</div>
