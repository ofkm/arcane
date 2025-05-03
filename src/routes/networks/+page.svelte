<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus, AlertCircle, Network, Trash2, Loader2, ChevronDown, ScanSearch, Ellipsis } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import type { PageData } from './$types';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import CreateNetworkDialog from './CreateNetworkDialog.svelte';
	import * as Table from '$lib/components/ui/table';
	import type { NetworkCreateOptions } from 'dockerode';
	import { handleApiReponse } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import NetworkAPIService from '$lib/services/api/network-api-service';

	let { data }: { data: PageData } = $props();

	let networkPageStates = $state({
		networks: data.networks,
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
		networkPageStates.networks = data.networks;
		networkPageStates.error = data.error;
	});

	const totalNetworks = $derived(networkPageStates.networks.length);
	const bridgeNetworks = $derived(networkPageStates.networks.filter((n) => n.driver === 'bridge').length);
	const overlayNetworks = $derived(networkPageStates.networks.filter((n) => n.driver === 'overlay').length);

	const networkApi = new NetworkAPIService();

	async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
		handleApiReponse(
			await tryCatch(networkApi.create(options)),
			'Failed to Create Network',
			(value) => (isLoading.create = value),
			async () => {
				toast.success('Network Created Successfully.');
				await invalidateAll();
				networkPageStates.isCreateDialogOpen = false;
			}
		);
	}

	async function handleDeleteNetwork(id: string) {
		openConfirmDialog({
			title: 'Delete Network',
			message: 'Are you sure you want to delete this network? This action cannot be undone.',
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiReponse(
						await tryCatch(networkApi.remove(encodeURIComponent(id))),
						'Failed to Remove Container',
						(value) => (isLoading.remove = value),
						async () => {
							toast.success('Network Removed Successfully.');
							await invalidateAll();
						}
					);
				}
			}
		});
	}

	async function handleDeleteSelected() {
		// Check if any selected networks are default networks
		const selectedNetworks = networkPageStates.selectedNetworks.map((id) => {
			const network = networkPageStates.networks.find((n) => n.id === id);
			return {
				id,
				name: network?.name || id.substring(0, 12),
				isDefault: network?.driver === 'host' || network?.name === 'bridge' || network?.name === 'none'
			};
		});

		const defaultNetworks = selectedNetworks.filter((n) => n.isDefault);

		if (defaultNetworks.length > 0) {
			const names = defaultNetworks.map((n) => n.name).join(', ');
			toast.error(`Cannot delete default networks: ${names}`);
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

					for (const network of selectedNetworks) {
						const result = await tryCatch(networkApi.remove(encodeURIComponent(network.id)));
						handleApiReponse(
							result,
							`Failed to delete network "${network.name}"`,
							(value) => (isLoading.remove = value),
							async () => {
								toast.success(`Network "${network.name}" deleted successfully.`);
								successCount++;
							}
						);

						if (result.error) {
							failureCount++;
						}
					}

					console.log(`Finished deleting. Success: ${successCount}, Failed: ${failureCount}`);
					if (successCount > 0) {
						setTimeout(async () => {
							await invalidateAll();
							networkPageStates.selectedNetworks = [];
						}, 500);
					} else {
						networkPageStates.selectedNetworks = [];
					}
				}
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Networks</h1>
			<p class="text-sm text-muted-foreground mt-1">Manage Docker container networking</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="secondary" data-testid="create-network-button" onclick={() => (networkPageStates.isCreateDialogOpen = true)} disabled={isLoading.create}>
				<Plus class="w-4 h-4" />
				Create Network
			</Button>
		</div>
	</div>

	{#if networkPageStates.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Error Loading Networks</Alert.Title>
			<Alert.Description>{networkPageStates.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Networks</p>
					<p class="text-2xl font-bold">{totalNetworks}</p>
				</div>
				<div class="bg-primary/10 p-2 rounded-full">
					<Network class="h-5 w-5 text-primary" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Bridge Networks</p>
					<p class="text-2xl font-bold">{bridgeNetworks}</p>
				</div>
				<div class="bg-blue-500/10 p-2 rounded-full">
					<Network class="h-5 w-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Overlay Networks</p>
					<p class="text-2xl font-bold">{overlayNetworks}</p>
				</div>
				<div class="bg-purple-500/10 p-2 rounded-full">
					<Network class="h-5 w-5 text-purple-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Network List</Card.Title>
					<Card.Description>Manage container communication</Card.Description>
				</div>
				<div class="flex items-center gap-2">
					{#if networkPageStates.selectedNetworks.length > 0}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" size="sm" disabled={isLoading.remove} aria-label={`Group actions for ${networkPageStates.selectedNetworks.length} selected network(s)`}>
										{#if isLoading.remove}
											<Loader2 class="w-4 h-4 animate-spin" />
											Processing...
										{:else}
											Actions ({networkPageStates.selectedNetworks.length})
											<ChevronDown class="w-4 h-4" />
										{/if}
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item onclick={() => handleDeleteSelected()} class="text-red-500 focus:!text-red-700" disabled={isLoading.remove}>
									<Trash2 class="w-4 h-4" />
									Delete Selected
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if networkPageStates.networks && networkPageStates.networks.length > 0}
				<UniversalTable
					data={networkPageStates.networks}
					columns={[
						{ accessorKey: 'name', header: 'Name' },
						{ accessorKey: 'driver', header: 'Driver' },
						{ accessorKey: 'scope', header: 'Scope' },
						{ accessorKey: 'subnet', header: 'Subnet' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					idKey="id"
					display={{
						filterPlaceholder: 'Search networks...',
						noResultsMessage: 'No networks found'
					}}
					sort={{
						defaultSort: { id: 'name', desc: false }
					}}
					bind:selectedIds={networkPageStates.selectedNetworks}
				>
					{#snippet rows({ item })}
						{@const isDefaultNetwork = item.driver === 'host' || item.name === 'bridge' || item.name === 'none'}
						<Table.Cell><a class="font-medium hover:underline" href="/networks/{item.id}/">{item.name}</a></Table.Cell>
						<Table.Cell>{item.driver}</Table.Cell>
						<Table.Cell>{item.scope}</Table.Cell>
						<Table.Cell>{item.subnet}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/networks/${item.id}`)} disabled={isAnyLoading}>
											<ScanSearch class="w-4 h-4" />
											Inspect
										</DropdownMenu.Item>
										{#if !isDefaultNetwork}
											<DropdownMenu.Separator />

											<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={() => handleDeleteNetwork(item.id)} disabled={isLoading.remove || isAnyLoading}>
												{#if isLoading.remove}
													<Loader2 class="w-4 h-4 animate-spin" />
												{:else}
													<Trash2 class="w-4 h-4" />
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
				<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
					<Network class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
					<p class="text-lg font-medium">No networks found</p>
					<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new network using the "Create Network" button above or use the Docker CLI</p>
					<div class="flex gap-3 mt-4">
						<Button variant="outline" size="sm" onclick={() => (networkPageStates.isCreateDialogOpen = true)}>
							<Plus class="h-4 w-4" />
							Create Network
						</Button>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<CreateNetworkDialog bind:open={networkPageStates.isCreateDialogOpen} isCreating={isLoading.create} onSubmit={handleCreateNetworkSubmit} />
</div>
