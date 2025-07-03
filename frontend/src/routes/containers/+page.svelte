<script lang="ts">
	import { Box } from '@lucide/svelte';
	import CreateContainerSheet from '$lib/components/sheets/create-container-sheet.svelte';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { PageData } from './$types';
	import StatCard from '$lib/components/stat-card.svelte';
	import type { ContainerInfo } from '$lib/models/container-info';
	import { autoUpdateAPI, environmentAPI } from '$lib/services/api';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import ContainerTable from './container-table.svelte';

	interface ContainerWithId extends ContainerInfo {
		id: string;
	}

	let { data }: { data: PageData } = $props();

	let containers = $state<ContainerInfo[]>([]);
	let paginatedContainers = $state<Paginated<ContainerWithId> | null>(null);
	let selectedIds = $state([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		checking: false,
		create: false,
		refreshing: false
	});

	const runningContainers = $derived(
		containers?.filter((c: ContainerInfo) => c.State === 'running').length || 0
	);
	const stoppedContainers = $derived(
		containers?.filter((c: ContainerInfo) => c.State === 'exited').length || 0
	);
	const totalContainers = $derived(containers?.length || 0);

	let requestOptions = $state<SearchPaginationSortRequest>(data.containerRequestOptions);

	$effect(() => {
		if (data.containers) {
			if (Array.isArray(data.containers)) {
				containers = data.containers;
				const paginatedData: Paginated<ContainerWithId> = {
					data: data.containers.map((c) => ({ ...c, id: c.Id })),
					pagination: {
						totalPages: 1,
						totalItems: data.containers.length,
						currentPage: 1,
						itemsPerPage: data.containers.length
					}
				};
				paginatedContainers = paginatedData;
			} else {
				const paginatedData: Paginated<ContainerWithId> = {
					data: data.containers.data.map((c) => ({ ...c, id: c.Id })),
					pagination: data.containers.pagination
				};
				paginatedContainers = paginatedData;
				containers = data.containers.data || [];
			}
		}
	});

	async function onRefresh(
		options: SearchPaginationSortRequest
	): Promise<Paginated<ContainerWithId>> {
		const response = await environmentAPI.getContainers(
			options.pagination,
			options.sort,
			options.search,
			options.filters
		);

		if (Array.isArray(response)) {
			containers = response;
			const paginatedResponse: Paginated<ContainerWithId> = {
				data: response.map((c) => ({ ...c, id: c.Id })),
				pagination: {
					totalPages: 1,
					totalItems: response.length,
					currentPage: options.pagination?.page || 1,
					itemsPerPage: response.length
				}
			};
			paginatedContainers = paginatedResponse;
			return paginatedResponse;
		} else {
			const paginatedResponse: Paginated<ContainerWithId> = {
				data: response.data.map((c) => ({ ...c, id: c.Id })),
				pagination: response.pagination
			};
			paginatedContainers = paginatedResponse;
			containers = response.data || [];
			return paginatedResponse;
		}
	}

	async function refreshContainers() {
		isLoading.refreshing = true;
		try {
			await onRefresh(requestOptions);
		} catch (error) {
			console.error('Failed to refresh containers:', error);
			toast.error('Failed to refresh containers');
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function handleCheckForUpdates() {
		isLoading.checking = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(autoUpdateAPI.checkContainers()),
			message: 'Failed to Check Containers for Updates',
			setLoadingState: (value) => (isLoading.checking = value),
			async onSuccess() {
				toast.success('Containers Updated Successfully.');
				await refreshContainers();
			}
		});
	}

	async function onContainersChanged() {
		await refreshContainers();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Containers</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Containers</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total"
			value={totalContainers}
			icon={Box}
			class="border-l-primary border-l-4 transition-shadow hover:shadow-lg"
		/>
		<StatCard
			title="Running"
			value={runningContainers}
			icon={Box}
			iconColor="text-green-500"
			bgColor="bg-green-500/10"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title="Stopped"
			value={stoppedContainers}
			icon={Box}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
	</div>

	<ContainerTable
		containers={paginatedContainers || {
			data: containers.map((c) => ({ ...c, id: c.Id })),
			pagination: {
				totalPages: 1,
				totalItems: containers.length,
				currentPage: 1,
				itemsPerPage: containers.length
			}
		}}
		bind:selectedIds
		bind:requestOptions
		{onRefresh}
		{onContainersChanged}
		onCheckForUpdates={handleCheckForUpdates}
	/>

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
					await refreshContainers();
					isCreateDialogOpen = false;
				}
			});
		}}
	/>
</div>
