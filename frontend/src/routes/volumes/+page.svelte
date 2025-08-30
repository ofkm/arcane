<script lang="ts">
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ArchiveRestoreIcon from '@lucide/svelte/icons/archive-restore';
	import ArchiveXIcon from '@lucide/svelte/icons/archive-x';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import CreateVolumeSheet from '$lib/components/sheets/create-volume-sheet.svelte';
	import type { VolumeCreateOptions } from 'dockerode';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { environmentAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import VolumeTable from './volume-table.svelte';

	let { data } = $props();

	let volumes = $state(data.volumes);
	let requestOptions = $state(data.volumeRequestOptions);
	let selectedIds = $state<string[]>([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		creating: false,
		refresh: false,
		removingSelected: false
	});

	const totalVolumes = $derived(volumes.data.length);
	const usedVolumes = $derived(volumes.data.filter((v) => v.inUse).length);
	const unusedVolumes = $derived(volumes.data.filter((v) => !v.inUse).length);

	async function handleCreateVolumeSubmit(options: VolumeCreateOptions) {
		isLoading.creating = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.createVolume(options)),
			message: `Failed to Create Volume "${options.Name}"`,
			setLoadingState: (value) => (isLoading.creating = value),
			onSuccess: async () => {
				toast.success(`Volume "${options.Name}" Created Successfully.`);
				volumes = await environmentAPI.getVolumes(requestOptions);
				isCreateDialogOpen = false;
			}
		});
	}

	async function refreshVolumes() {
		isLoading.refresh = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.getVolumes(requestOptions)),
			message: 'Failed to Refresh Volumes',
			setLoadingState: (value) => (isLoading.refresh = value),
			async onSuccess(newVolumes) {
				volumes = newVolumes;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Volumes</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage your Docker volumes</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="create"
				customLabel="Create Volume"
				onclick={() => (isCreateDialogOpen = true)}
				loading={isLoading.creating}
				disabled={isLoading.creating}
			/>
			<ArcaneButton
				action="restart"
				onclick={refreshVolumes}
				customLabel="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total Volumes"
			value={totalVolumes}
			icon={HardDriveIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Used Volumes"
			value={usedVolumes}
			icon={ArchiveRestoreIcon}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title="Unused Volumes"
			value={unusedVolumes}
			icon={ArchiveXIcon}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
	</div>

	<VolumeTable bind:volumes bind:selectedIds bind:requestOptions />

	<CreateVolumeSheet bind:open={isCreateDialogOpen} isLoading={isLoading.creating} onSubmit={handleCreateVolumeSubmit} />
</div>
