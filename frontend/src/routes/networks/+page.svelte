<script lang="ts">
	import { Network, EthernetPort } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import type { NetworkCreateOptions, NetworkInspectInfo } from 'dockerode';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateNetworkSheet from '$lib/components/sheets/create-network-sheet.svelte';
	import { environmentAPI } from '$lib/services/api';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import StatCard from '$lib/components/stat-card.svelte';
	import NetworkTable from './network-table.svelte';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import type { PageData } from './$types';

	interface NetworkWithId extends NetworkInspectInfo {
		id: string;
	}

	let { data }: { data: PageData } = $props();

	let networks = $state<NetworkInspectInfo[]>([]);
	let paginatedNetworks = $state<Paginated<NetworkWithId & { ID: string }> | null>(null);
	let selectedIds = $state<string[]>([]);
	let error = $state<string | null>(null);
	let isCreateDialogOpen = $state(false);
	let requestOptions = $state<SearchPaginationSortRequest>(data.networkRequestOptions);

	let isLoading = $state({
		create: false,
		refresh: false
	});

	$effect(() => {
		if (data.networks) {
			if (Array.isArray(data.networks)) {
				networks = data.networks;
				const paginatedData: Paginated<NetworkWithId & { ID: string }> = {
					data: data.networks.map((n) => ({ ...n, id: n.Id, ID: n.Id })),
					pagination: {
						totalPages: 1,
						totalItems: data.networks.length,
						currentPage: 1,
						itemsPerPage: data.networks.length
					}
				};
				paginatedNetworks = paginatedData;
			} else {
				const paginatedData: Paginated<NetworkWithId & { ID: string }> = {
					data: data.networks.data.map((n) => ({ ...n, id: n.Id, ID: n.Id })),
					pagination: data.networks.pagination
				};
				paginatedNetworks = paginatedData;
				networks = data.networks.data || [];
			}
		}
	});

	const totalNetworks = $derived(networks.length);
	const bridgeNetworks = $derived(networks.filter((n) => n.Driver === 'bridge').length);

	async function onRefresh(
		options: SearchPaginationSortRequest
	): Promise<Paginated<NetworkWithId & { ID: string }>> {
		const response = await environmentAPI.getNetworks(
			options.pagination,
			options.sort,
			options.search,
			options.filters
		);

		if (Array.isArray(response)) {
			networks = response;
			const paginatedResponse: Paginated<NetworkWithId & { ID: string }> = {
				data: response.map((n) => ({ ...n, id: n.Id, ID: n.Id })),
				pagination: {
					totalPages: 1,
					totalItems: response.length,
					currentPage: options.pagination?.page || 1,
					itemsPerPage: response.length
				}
			};
			paginatedNetworks = paginatedResponse;
			return paginatedResponse;
		} else {
			const paginatedResponse: Paginated<NetworkWithId & { ID: string }> = {
				data: response.data.map((n) => ({ ...n, id: n.Id, ID: n.Id })),
				pagination: response.pagination
			};
			paginatedNetworks = paginatedResponse;
			networks = response.data || [];
			return paginatedResponse;
		}
	}

	async function refreshNetworks() {
		isLoading.refresh = true;
		try {
			await onRefresh(requestOptions);
		} catch (error) {
			console.error('Failed to refresh networks:', error);
			toast.error('Failed to refresh networks');
		} finally {
			isLoading.refresh = false;
		}
	}

	async function onNetworksChanged() {
		await refreshNetworks();
	}

	async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
		isLoading.create = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createNetwork(options)),
			message: `Failed to Create Network "${options.Name}"`,
			setLoadingState: (value) => (isLoading.create = value),
			onSuccess: async () => {
				toast.success(`Network "${options.Name}" Created Successfully.`);
				await refreshNetworks();
				isCreateDialogOpen = false;
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
			<ArcaneButton
				action="restart"
				onClick={refreshNetworks}
				label="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Error Loading Networks</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<StatCard
			title="Total Networks"
			value={totalNetworks}
			icon={Network}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Bridge Networks"
			value={bridgeNetworks}
			icon={EthernetPort}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
	</div>

	<NetworkTable
		networks={paginatedNetworks || {
			data: networks.map((n) => ({ ...n, id: n.Id, ID: n.Id })),
			pagination: {
				totalPages: 1,
				totalItems: networks.length,
				currentPage: 1,
				itemsPerPage: networks.length
			}
		}}
		bind:selectedIds
		bind:requestOptions
		{onRefresh}
		{onNetworksChanged}
		onCreateNetwork={() => (isCreateDialogOpen = true)}
	/>

	<CreateNetworkSheet
		bind:open={isCreateDialogOpen}
		isLoading={isLoading.create}
		onSubmit={handleCreateNetworkSubmit}
	/>
</div>
