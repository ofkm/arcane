<script lang="ts">
	import NetworkIcon from '@lucide/svelte/icons/network';
	import EthernetPortIcon from '@lucide/svelte/icons/ethernet-port';
	import { toast } from 'svelte-sonner';
	import type { NetworkCreateOptions } from 'dockerode';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateNetworkSheet from '$lib/components/sheets/create-network-sheet.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import StatCard from '$lib/components/stat-card.svelte';
	import NetworkTable from './network-table.svelte';
	import { m } from '$lib/paraglide/messages';
	import { networkService } from '$lib/services/network-service';

	let { data } = $props();

	let { networks, networkUsageCounts, networkRequestOptions: requestOptions } = $state(data);
	let selectedIds = $state<string[]>([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		create: false,
		refresh: false
	});

	const totalNetworks = $derived(networkUsageCounts.totalNetworks);
	const unusedNetworks = $derived(networkUsageCounts.networksUnused);

	async function refreshNetworks() {
		isLoading.refresh = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(networkService.getNetworks(requestOptions)),
			message: m.networks_refresh_failed(),
			setLoadingState: (value) => (isLoading.refresh = value),
			async onSuccess(newNetworks) {
				networks = newNetworks;
			}
		});
	}

	async function handleCreateNetworkSubmit(options: NetworkCreateOptions) {
		isLoading.create = true;
		const name = options.Name?.trim() || m.common_unknown();
		handleApiResultWithCallbacks({
			result: await tryCatch(networkService.createNetwork(options)),
			message: m.networks_create_failed({ name }),
			setLoadingState: (value) => (isLoading.create = value),
			onSuccess: async () => {
				toast.success(m.networks_created_success({ name }));
				networks = await networkService.getNetworks(requestOptions);
				isCreateDialogOpen = false;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{m.networks_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{m.networks_subtitle()}</p>
		</div>
		<div class="hidden items-center gap-2 sm:flex">
			<ArcaneButton action="create" customLabel={m.networks_create_button()} onclick={() => (isCreateDialogOpen = true)} />
			<ArcaneButton
				action="restart"
				onclick={refreshNetworks}
				customLabel={m.common_refresh()}
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>

		<div class="absolute right-4 top-4 flex items-center sm:hidden">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="bg-background/70 flex inline-flex size-9 items-center justify-center rounded-lg border">
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</DropdownMenu.Trigger>

				<DropdownMenu.Content
					align="end"
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 z-50 min-w-[160px] rounded-md p-1 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm"
				>
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={() => (isCreateDialogOpen = true)} disabled={isLoading.create}
							>{m.networks_create_button()}</DropdownMenu.Item
						>
						<DropdownMenu.Item onclick={refreshNetworks} disabled={isLoading.refresh}>{m.common_refresh()}</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<StatCard
			title={m.networks_total()}
			value={totalNetworks}
			icon={NetworkIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title={m.unused_networks()}
			value={unusedNetworks}
			icon={EthernetPortIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
	</div>

	<NetworkTable bind:networks bind:selectedIds bind:requestOptions />

	<CreateNetworkSheet bind:open={isCreateDialogOpen} isLoading={isLoading.create} onSubmit={handleCreateNetworkSubmit} />
</div>
