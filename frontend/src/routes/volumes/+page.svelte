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
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import StatCard from '$lib/components/stat-card.svelte';
	import VolumeTable from './volume-table.svelte';
	import { m } from '$lib/paraglide/messages';
	import { volumeService } from '$lib/services/volume-service';
    import { environmentStore } from '$lib/stores/environment.store';
    import type { Environment } from '$lib/types/environment.type';

	let { data } = $props();

	let { volumes, volumeUsageCounts, volumeRequestOptions: requestOptions } = $state(data);

	let selectedIds = $state<string[]>([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		creating: false,
		refresh: false,
		removingSelected: false
	});

	const totalVolumes = $derived(volumeUsageCounts.totalVolumes);
	const usedVolumes = $derived(volumeUsageCounts.volumesInuse);
	const unusedVolumes = $derived(volumeUsageCounts.volumesUnused);

	async function handleCreateVolumeSubmit(options: VolumeCreateOptions) {
		isLoading.creating = true;
		const name = options.Name?.trim() || m.common_unknown();
		handleApiResultWithCallbacks({
			result: await tryCatch(volumeService.createVolume(options)),
			message: m.volumes_create_failed({ name }),
			setLoadingState: (value) => (isLoading.creating = value),
			onSuccess: async () => {
				toast.success(m.volumes_created_success({ name }));
				volumes = await volumeService.getVolumes(requestOptions);
				isCreateDialogOpen = false;
			}
		});
	}

	async function refreshVolumes() {
		isLoading.refresh = true;
		let refreshingVolumeList = true;
		let refreshingVolumeCounts = true;		
		handleApiResultWithCallbacks({
			result: await tryCatch(volumeService.getVolumes(requestOptions)),
			message: m.volumes_refresh_failed(),
			setLoadingState: (value) => {
				refreshingVolumeList = value;
				isLoading.refresh = refreshingVolumeCounts || refreshingVolumeList;
			},
			async onSuccess(newVolumes) {
				volumes = newVolumes;
			}
		});
		handleApiResultWithCallbacks({
			result: await tryCatch(volumeService.getVolumeUsageCounts()),
			message: m.volumes_refresh_failed(),
			setLoadingState: (value) => {
				refreshingVolumeCounts = value;
				isLoading.refresh = refreshingVolumeCounts || refreshingVolumeList;
			},
			async onSuccess(newVolumeCounts) {
				volumeUsageCounts = newVolumeCounts;
			}
		});
	}

	// React to environment changes
	const selectedEnvStore = environmentStore.selected;
	let lastEnvId: string | null = null;
	$effect(() => {
		const env = $selectedEnvStore as Environment | null;
		if (!env) return;
		// Skip initial page load
		if (lastEnvId === null) {
			lastEnvId = env.id;
			return;
		}
		if (env.id !== lastEnvId) {
			lastEnvId = env.id;
			refreshVolumes();
		}
	});
</script>

<div class="space-y-6">
	<div class="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{m.volumes_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{m.volumes_subtitle()}</p>
		</div>
		<div class="hidden items-center gap-2 sm:flex">
			<ArcaneButton
				action="create"
				customLabel={m.volumes_create_button()}
				onclick={() => (isCreateDialogOpen = true)}
				loading={isLoading.creating}
				disabled={isLoading.creating}
			/>
			<ArcaneButton
				action="restart"
				onclick={refreshVolumes}
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
						<DropdownMenu.Item onclick={() => (isCreateDialogOpen = true)} disabled={isLoading.creating}>
							{m.volumes_create_button()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={refreshVolumes} disabled={isLoading.refresh}>
							{m.common_refresh()}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title={m.volumes_stat_total()}
			value={totalVolumes}
			icon={HardDriveIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title={m.volumes_stat_used()}
			value={usedVolumes}
			icon={ArchiveRestoreIcon}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title={m.volumes_stat_unused()}
			value={unusedVolumes}
			icon={ArchiveXIcon}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
	</div>

	<VolumeTable bind:volumes bind:selectedIds bind:requestOptions />

	<CreateVolumeSheet bind:open={isCreateDialogOpen} isLoading={isLoading.creating} onSubmit={handleCreateVolumeSubmit} />
</div>
