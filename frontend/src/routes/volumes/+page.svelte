<script lang="ts">
	import { HardDrive, Loader2, ArchiveRestore, ArchiveX } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateVolumeSheet from '$lib/components/sheets/create-volume-sheet.svelte';
	import type { VolumeCreateOptions, VolumeInspectInfo } from 'dockerode';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { environmentAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import VolumeTable from './volume-table.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';

	type EnhancedVolumeInfo = VolumeInspectInfo & {
		InUse: boolean;
		CreatedAt: string;
		id: string;
	};

	let { data } = $props();

	let volumes = $state<EnhancedVolumeInfo[]>(
		Array.isArray(data.volumes) ? data.volumes : data.volumes.data || []
	);
	let error = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let requestOptions = $state<SearchPaginationSortRequest>(data.volumeRequestOptions);

	let isDialogOpen = $state({
		create: false
	});

	let isLoading = $state({
		creating: false,
		refresh: false
	});

	const totalVolumes = $derived(volumes.length);
	const usedVolumes = $derived(volumes.filter((v) => v.InUse).length);
	const unusedVolumes = $derived(volumes.filter((v) => !v.InUse).length);

	async function loadVolumes() {
		try {
			isLoading.refresh = true;
			const response = await environmentAPI.getVolumes(
				requestOptions.pagination,
				requestOptions.sort,
				requestOptions.search,
				requestOptions.filters
			);
			volumes = Array.isArray(response) ? response : response.data || [];
			error = null;
		} catch (err) {
			console.error('Failed to load volumes:', err);
			error = err instanceof Error ? err.message : 'Failed to load volumes';
			volumes = [];
		} finally {
			isLoading.refresh = false;
		}
	}

	async function onRefresh(options: SearchPaginationSortRequest) {
		requestOptions = options;
		await loadVolumes();
		return {
			data: volumes,
			pagination: {
				totalPages: Math.ceil(volumes.length / (requestOptions.pagination?.limit || 20)),
				totalItems: volumes.length,
				currentPage: requestOptions.pagination?.page || 1,
				itemsPerPage: requestOptions.pagination?.limit || 20
			}
		};
	}

	async function handleCreateVolumeSubmit(options: VolumeCreateOptions) {
		isLoading.creating = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createVolume(options)),
			message: `Failed to Create Volume "${options.Name}"`,
			setLoadingState: (value) => (isLoading.creating = value),
			onSuccess: async () => {
				toast.success(`Volume "${options.Name}" Created Successfully.`);
				await loadVolumes();
				isDialogOpen.create = false;
			}
		});
	}

	async function refreshVolumes() {
		isLoading.refresh = true;
		try {
			await loadVolumes();
		} catch (error) {
			console.error('Failed to refresh volumes:', error);
			toast.error('Failed to refresh volumes');
		} finally {
			isLoading.refresh = false;
		}
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Volumes</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage your Docker volumes</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="create"
				label="Create Volume"
				onClick={() => (isDialogOpen.create = true)}
				loading={isLoading.creating}
				disabled={isLoading.creating}
			/>
			<ArcaneButton
				action="restart"
				onClick={refreshVolumes}
				label="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Error Loading Volumes</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total Volumes"
			value={totalVolumes}
			icon={HardDrive}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Used Volumes"
			value={usedVolumes}
			icon={ArchiveRestore}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title="Unused Volumes"
			value={unusedVolumes}
			icon={ArchiveX}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
	</div>

	<VolumeTable
		{volumes}
		bind:selectedIds
		bind:requestOptions
		{onRefresh}
		onVolumesChanged={loadVolumes}
	/>

	<CreateVolumeSheet
		bind:open={isDialogOpen.create}
		isLoading={isLoading.creating}
		onSubmit={handleCreateVolumeSubmit}
	/>
</div>
