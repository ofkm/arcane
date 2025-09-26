<script lang="ts">
	import BoxIcon from '@lucide/svelte/icons/box';
	import CreateContainerSheet from '$lib/components/sheets/create-container-sheet.svelte';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import StatCard from '$lib/components/stat-card.svelte';
	import { containerService } from '$lib/services/container-service';
	import ContainerTable from './container-table.svelte';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { m } from '$lib/paraglide/messages';
	import { imageService } from '$lib/services/image-service';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';

	let { data } = $props();

	let { containers, containerStatusCounts, containerRequestOptions } = $state(data);

	let requestOptions = $state(containerRequestOptions);
	let selectedIds = $state([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		checking: false,
		create: false,
		refreshing: false
	});

	const baseServerUrl = $derived(
		(data.settings as any)?.serverBaseUrl ?? (data.settings as any)?.baseServerUrl ?? (data.settings as any)?.baseUrl ?? ''
	);

	async function handleCheckForUpdates() {
		isLoading.checking = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(imageService.runAutoUpdate()),
			message: 'Failed to Check Containers for Updates',
			setLoadingState: (value) => (isLoading.checking = value),
			async onSuccess() {
				toast.success('Containers Updated Successfully.');
				containers = await containerService.getContainers(requestOptions);
			}
		});
	}

	async function refreshContainers() {
		isLoading.refreshing = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(containerService.getContainers(requestOptions)),
			message: 'Failed to Refresh Containers',
			setLoadingState: (value) => (isLoading.refreshing = value),
			async onSuccess(newContainers) {
				containers = newContainers;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{m.containers_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{m.containers_subtitle()}</p>
		</div>
		<!-- Desktop buttons -->
		<div class="hidden items-center gap-2 sm:flex">
			<ArcaneButton
				action="create"
				customLabel={m.containers_create_button()}
				onclick={() => (isCreateDialogOpen = true)}
				loading={isLoading.create}
				disabled={isLoading.create}
			/>
			<ArcaneButton
				action="inspect"
				customLabel={m.containers_check_updates()}
				onclick={handleCheckForUpdates}
				loading={isLoading.checking}
				disabled={isLoading.checking}
			/>
			<ArcaneButton
				action="restart"
				onclick={refreshContainers}
				customLabel={m.common_refresh()}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>

		<!-- Mobile / tablet: dropdown menu (positioned top-right on small screens) -->
		<div class="absolute right-4 top-4 flex items-center sm:static sm:hidden">
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
						<DropdownMenu.Item onclick={() => (isCreateDialogOpen = true)} disabled={isLoading.create}>
							{m.containers_create_button()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={handleCheckForUpdates} disabled={isLoading.checking}>
							{m.containers_check_updates()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={refreshContainers} disabled={isLoading.refreshing}>
							{m.common_refresh()}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title={m.containers_total()}
			value={containerStatusCounts.totalContainers}
			icon={BoxIcon}
			class="border-l-primary border-l-4 transition-shadow hover:shadow-lg"
		/>
		<StatCard
			title={m.containers_running()}
			value={containerStatusCounts.runningContainers}
			icon={BoxIcon}
			iconColor="text-green-500"
			bgColor="bg-green-500/10"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title={m.containers_stopped()}
			value={containerStatusCounts.stoppedContainers}
			icon={BoxIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
	</div>

	<ContainerTable bind:containers bind:selectedIds bind:requestOptions {baseServerUrl} />

	<CreateContainerSheet
		bind:open={isCreateDialogOpen}
		availableVolumes={[]}
		availableNetworks={[]}
		availableImages={[]}
		isLoading={isLoading.create}
		onSubmit={async (options) => {
			isLoading.create = true;
			handleApiResultWithCallbacks({
				result: await tryCatch(containerService.createContainer(options)),
				message: m.containers_create_failed(),
				setLoadingState: (value) => (isLoading.create = value),
				onSuccess: async () => {
					toast.success(m.containers_create_success());
					containers = await containerService.getContainers(requestOptions);
					isCreateDialogOpen = false;
				}
			});
		}}
	/>
</div>
