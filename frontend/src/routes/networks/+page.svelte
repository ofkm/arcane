<script lang="ts">
	import NetworkIcon from '@lucide/svelte/icons/network';
	import EthernetPortIcon from '@lucide/svelte/icons/ethernet-port';
	import { toast } from 'svelte-sonner';
	import type { NetworkCreateOptions } from 'dockerode';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateNetworkSheet from '$lib/components/sheets/create-network-sheet.svelte';
	import { environmentAPI } from '$lib/services/api';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import StatCard from '$lib/components/stat-card.svelte';
	import NetworkTable from './network-table.svelte';

	let { data } = $props();

	let networks = $state(data.networks);
	let requestOptions = $state(data.networkRequestOptions);
	let selectedIds = $state<string[]>([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		create: false,
		refresh: false
	});

	const totalNetworks = $derived(networks.data.length);
	const bridgeNetworks = $derived(networks.data.filter((n) => n.driver === 'bridge').length);

	async function refreshNetworks() {
		isLoading.refresh = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.getNetworks(requestOptions)),
			message: 'Failed to Refresh Containers for Updates',
			setLoadingState: (value) => (isLoading.refresh = value),
			async onSuccess(newNetworks) {
				networks = newNetworks;
			}
		});
	}

	async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
		isLoading.create = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createNetwork(options)),
			message: `Failed to Create Network "${options.Name}"`,
			setLoadingState: (value) => (isLoading.create = value),
			onSuccess: async () => {
				toast.success(`Network "${options.Name}" Created Successfully.`);
				networks = await environmentAPI.getNetworks(requestOptions);
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
			<ArcaneButton action="create" customLabel="Create Network" onclick={() => (isCreateDialogOpen = true)} />
			<ArcaneButton
				action="restart"
				onclick={refreshNetworks}
				customLabel="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<StatCard
			title="Total Networks"
			value={totalNetworks}
			icon={NetworkIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Bridge Networks"
			value={bridgeNetworks}
			icon={EthernetPortIcon}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
	</div>

	<NetworkTable bind:networks bind:selectedIds bind:requestOptions />

	<CreateNetworkSheet bind:open={isCreateDialogOpen} isLoading={isLoading.create} onSubmit={handleCreateNetworkSubmit} />
</div>
