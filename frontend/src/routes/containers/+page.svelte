<script lang="ts">
	import BoxIcon from '@lucide/svelte/icons/box';
	import CreateContainerSheet from '$lib/components/sheets/create-container-sheet.svelte';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import StatCard from '$lib/components/stat-card.svelte';
	import { autoUpdateAPI, environmentAPI } from '$lib/services/api';
	import ContainerTable from './container-table.svelte';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';

	let { data } = $props();

	let containers = $state(data.containers);
	let requestOptions = $state(data.containerRequestOptions);
	let selectedIds = $state([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		checking: false,
		create: false,
		refreshing: false
	});

	async function handleCheckForUpdates() {
		isLoading.checking = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(autoUpdateAPI.checkContainers()),
			message: 'Failed to Check Containers for Updates',
			setLoadingState: (value) => (isLoading.checking = value),
			async onSuccess() {
				toast.success('Containers Updated Successfully.');
				containers = await environmentAPI.getContainers(requestOptions);
			}
		});
	}

	const runningContainers = $derived(containers.data.filter((s) => s.state === 'running').length);
	const stoppedContainers = $derived(containers.data.filter((s) => s.state != 'running').length);

	async function refreshContainers() {
		isLoading.refreshing = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.getContainers(requestOptions)),
			message: 'Failed to Refresh Containers',
			setLoadingState: (value) => (isLoading.refreshing = value),
			async onSuccess(newContainers) {
				containers = newContainers;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Containers</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Containers</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="create"
				customLabel="Create Container"
				onclick={() => (isCreateDialogOpen = true)}
				loading={isLoading.create}
				disabled={isLoading.create}
			/>
			<ArcaneButton
				action="inspect"
				customLabel="Update Containers"
				onclick={handleCheckForUpdates}
				loading={isLoading.checking}
				disabled={isLoading.checking}
			/>
			<ArcaneButton
				action="restart"
				onclick={refreshContainers}
				customLabel="Refresh"
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total"
			value={containers.pagination.totalItems}
			icon={BoxIcon}
			class="border-l-primary border-l-4 transition-shadow hover:shadow-lg"
		/>
		<StatCard
			title="Running"
			value={runningContainers}
			icon={BoxIcon}
			iconColor="text-green-500"
			bgColor="bg-green-500/10"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title="Stopped"
			value={stoppedContainers}
			icon={BoxIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
	</div>

	<ContainerTable bind:containers bind:selectedIds bind:requestOptions />

	<CreateContainerSheet
		bind:open={isCreateDialogOpen}
		availableVolumes={[]}
		availableNetworks={[]}
		availableImages={[]}
		isLoading={isLoading.create}
		onSubmit={async (options) => {
			isLoading.create = true;
			handleApiResultWithCallbacks({
				result: await tryCatch(environmentAPI.createContainer(options)),
				message: 'Failed to Create Container',
				setLoadingState: (value) => (isLoading.create = value),
				onSuccess: async () => {
					toast.success('Container Created Successfully.');
					containers = await environmentAPI.getContainers(requestOptions);
					isCreateDialogOpen = false;
				}
			});
		}}
	/>
</div>
