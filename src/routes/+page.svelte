<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { AlertCircle, Box, HardDrive, Cpu, MemoryStick, ArrowRight, PlayCircle, StopCircle, Trash2, Settings, RefreshCw, Loader2, Monitor } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { capitalizeFirstLetter, truncateString, shortId } from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PruneConfirmationDialog from '$lib/components/dialogs/prune-confirmation-dialog.svelte';
	import * as Table from '$lib/components/ui/table';
	import { statusVariantMap } from '$lib/types/statuses';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ContainerAPIService from '$lib/services/api/container-api-service';
	import SystemAPIService from '$lib/services/api/system-api-service';
	import type { EnhancedImageInfo } from '$lib/types/docker';
	import type { ContainerInfo } from 'dockerode';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import MaturityItem from '$lib/components/maturity-item.svelte';
	import { onMount } from 'svelte';
	import { maturityStore } from '$lib/stores/maturity-store';
	import ImageAPIService from '$lib/services/api/image-api-service';
	import type { PruneType } from '$lib/types/actions.type';
	import DropdownCard from '$lib/components/dropdown-card.svelte';

	let { data }: { data: PageData & { containers: ContainerInfo[] } } = $props();

	const containerApi = new ContainerAPIService();
	const systemApi = new SystemAPIService();
	const imageApi = new ImageAPIService();

	let dashboardStates = $state({
		dockerInfo: data.dockerInfo,
		containers: data.containers,
		images: data.images as EnhancedImageInfo[],
		settings: data.settings,
		error: data.error,
		isPruneDialogOpen: false
	});

	let isLoading = $state({
		starting: false,
		stopping: false,
		refreshing: false,
		pruning: false
	});

	const runningContainers = $derived(dashboardStates.containers?.filter((c: ContainerInfo) => c.State === 'running').length ?? 0);
	const stoppedContainers = $derived(dashboardStates.containers?.filter((c: ContainerInfo) => c.State === 'exited').length ?? 0);
	const totalImageSize = $derived(dashboardStates.images?.reduce((sum, image) => sum + (image.Size || 0), 0) ?? 0);

	function getContainerDisplayName(container: ContainerInfo): string {
		if (container.Names && container.Names.length > 0) {
			return container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
		}
		return shortId(container.Id);
	}

	$effect(() => {
		dashboardStates.dockerInfo = data.dockerInfo;
		dashboardStates.containers = data.containers;
		dashboardStates.images = data.images as EnhancedImageInfo[];
		dashboardStates.settings = data.settings;
		dashboardStates.error = data.error;
	});

	onMount(async () => {
		await loadTopImagesMaturity();
	});

	async function refreshData() {
		if (isLoading.refreshing) return;
		isLoading.refreshing = true;
		try {
			await invalidateAll();
		} catch (err) {
			console.error('Error during dashboard refresh:', err);
			dashboardStates.error = 'Failed to refresh dashboard data.';
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function handleStartAll() {
		if (isLoading.starting || !dashboardStates.dockerInfo || stoppedContainers === 0) return;
		isLoading.starting = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(containerApi.startAll()),
			message: 'Failed to Start All Containers',
			setLoadingState: (value) => (isLoading.starting = value),
			onSuccess: async () => {
				toast.success('All Containers Started Successfully.');
				await invalidateAll();
			}
		});
	}

	async function handleStopAll() {
		if (isLoading.stopping || !dashboardStates.dockerInfo || runningContainers === 0) return;
		openConfirmDialog({
			title: 'Stop All Containers',
			message: 'Are you sure you want to stop all running containers?',
			confirm: {
				label: 'Confirm',
				destructive: false,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(containerApi.stopAll()),
						message: 'Failed to Stop All Running Containers',
						setLoadingState: (value) => (isLoading.stopping = value),
						onSuccess: async () => {
							toast.success('All Containers Stopped Successfully.');
							await invalidateAll();
						}
					});
				}
			}
		});
	}

	async function confirmPrune(selectedTypes: PruneType[]) {
		if (isLoading.pruning || selectedTypes.length === 0) return;
		isLoading.pruning = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(systemApi.prune(selectedTypes)),
			message: `Failed to Prune ${selectedTypes.join(', ')}`,
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async () => {
				dashboardStates.isPruneDialogOpen = false;
				const formattedTypes = selectedTypes.map((type) => capitalizeFirstLetter(type)).join(', ');
				toast.success(`${formattedTypes} ${selectedTypes.length > 1 ? 'were' : 'was'} pruned successfully.`);
				await invalidateAll();
			}
		});
	}

	async function loadTopImagesMaturity() {
		if (!dashboardStates.images || dashboardStates.images.length === 0) return;

		const topImageIds = [...dashboardStates.images]
			.sort((a, b) => (b.Size || 0) - (a.Size || 0))
			.slice(0, 5)
			.filter((img) => img.repo !== '<none>' && img.tag !== '<none>')
			.map((img) => img.Id);

		if (topImageIds.length === 0) return;

		try {
			const BATCH_SIZE = 2;
			for (let i = 0; i < topImageIds.length; i += BATCH_SIZE) {
				const batch = topImageIds.slice(i, i + BATCH_SIZE);
				await imageApi.checkMaturityBatch(batch);

				dashboardStates.images = dashboardStates.images.map((image) => {
					const storedMaturity = $maturityStore.maturityData[image.Id];
					return {
						...image,
						maturity: storedMaturity !== undefined ? storedMaturity : image.maturity
					};
				});

				if (i + BATCH_SIZE < topImageIds.length) {
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
			}
		} catch (error) {
			console.error('Error loading maturity data for dashboard images:', error);
		}
	}
</script>

<div class="space-y-8">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-sm text-muted-foreground mt-1">Overview of your Container Environment</p>
		</div>
		<Button variant="outline" size="sm" class="h-9 arcane-button-restart" onclick={refreshData} disabled={isLoading.refreshing || isLoading.starting || isLoading.stopping || isLoading.pruning}>
			{#if isLoading.refreshing}
				<Loader2 class="mr-2 animate-spin size-4" />
			{:else}
				<RefreshCw class="mr-2 size-4" />
			{/if}
			Refresh
		</Button>
	</div>

	{#if dashboardStates.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Connection Error</Alert.Title>
			<Alert.Description>
				{dashboardStates.error} Please check your Docker connection in
				<a href="/settings" class="underline">Settings</a>.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<section>
		<DropdownCard id="system-overview" title="System Overview" description="Hardware and Docker engine information" icon={Monitor} defaultExpanded={true}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card.Root class="overflow-hidden border-l-4 border-l-green-500">
					<Card.Content class="p-6">
						<div class="flex justify-between items-start">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Running Containers</p>
								<div class="mt-1">
									<p class="text-2xl font-bold">
										{runningContainers}
										<span class="text-xs font-normal text-muted-foreground ml-1">/ {dashboardStates.containers?.length || 0}</span>
									</p>
								</div>
							</div>
							<div class="bg-green-500/10 p-2 rounded-full">
								<Box class="text-green-500 size-5" />
							</div>
						</div>
						{#if dashboardStates.containers?.length}
							<Progress value={(runningContainers / (dashboardStates.containers.length || 1)) * 100} class="mt-4 h-2" />
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root class="overflow-hidden border-l-4 border-l-blue-500">
					<Card.Content class="p-6">
						<div class="flex justify-between items-start">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Images</p>
								<p class="text-2xl font-bold mt-1">{dashboardStates.dockerInfo?.Images || 0}</p>
							</div>
							<div class="bg-blue-500/10 p-2 rounded-full">
								<HardDrive class="text-blue-500 size-5" />
							</div>
						</div>
						{#if totalImageSize > 0}
							<div class="mt-4 text-xs text-muted-foreground">
								Total size: {formatBytes(totalImageSize)}
							</div>
						{:else if dashboardStates.dockerInfo?.Images === 0}
							<div class="mt-4 text-xs text-muted-foreground">No images stored</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root class="overflow-hidden border-l-4 border-l-purple-500">
					<Card.Content class="p-6">
						<div class="flex justify-between items-start">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Hardware Resources</p>
								<div class="grid grid-cols-2 gap-x-4 mt-2">
									<div>
										<p class="text-xs text-muted-foreground">CPU</p>
										<p class="text-lg font-semibold">{dashboardStates.dockerInfo?.NCPU || 'N/A'}</p>
									</div>
									<div>
										<p class="text-xs text-muted-foreground">Memory</p>
										<p class="text-lg font-semibold">{dashboardStates.dockerInfo?.MemTotal ? formatBytes(dashboardStates.dockerInfo.MemTotal, 0) : 'N/A'}</p>
									</div>
								</div>
							</div>
							<div class="bg-purple-500/10 p-2 rounded-full">
								<Cpu class="text-purple-500 size-5" />
							</div>
						</div>
						<div class="mt-4 text-xs text-muted-foreground">
							{dashboardStates.dockerInfo?.Architecture || 'Unknown architecture'}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="overflow-hidden border-l-4 border-l-amber-500">
					<Card.Content class="p-6">
						<div class="flex justify-between items-start">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Docker Engine</p>
								<p class="text-xl font-semibold mt-1">
									{dashboardStates.dockerInfo?.ServerVersion || 'Unknown version'}
								</p>
							</div>
							<div class="bg-amber-500/10 p-2 rounded-full">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500 size-5">
									<path d="M8 17v2a3 3 0 0 1-3 3H3"></path><path d="M12 17h10"></path><path d="M16 7H3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h7"></path>
									<circle cx="20" cy="9" r="2"></circle>
								</svg>
							</div>
						</div>
						<div class="mt-4 grid grid-cols-2 gap-2">
							<div>
								<p class="text-xs font-medium text-muted-foreground">Operating System</p>
								<p class="text-sm">{dashboardStates.dockerInfo?.OperatingSystem || 'Unknown OS'}</p>
							</div>
							<div>
								<p class="text-xs font-medium text-muted-foreground">Kernel Version</p>
								<p class="text-sm">{dashboardStates.dockerInfo?.KernelVersion || 'Unknown'}</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</DropdownCard>
	</section>

	<section>
		<h2 class="text-lg font-semibold tracking-tight mb-4">Quick Actions</h2>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
			<button class="group relative flex flex-col items-center p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm" disabled={!dashboardStates.dockerInfo || stoppedContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning} onclick={handleStartAll}>
				<div class="size-10 rounded-full flex items-center justify-center mb-3 bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
					{#if isLoading.starting}
						<Loader2 class="text-green-500 animate-spin size-5" />
					{:else}
						<PlayCircle class="text-green-500 size-5" />
					{/if}
				</div>
				<span class="text-base font-medium mb-2">Start All Stopped</span>
				<StatusBadge variant="sky" text={stoppedContainers.toString()} class="mb-3" />
				<p class="text-xs text-muted-foreground">Start all stopped containers</p>
			</button>

			<button class="group relative flex flex-col items-center p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm" disabled={!dashboardStates.dockerInfo || runningContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning} onclick={handleStopAll}>
				<div class="size-10 rounded-full flex items-center justify-center mb-3 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
					{#if isLoading.stopping}
						<Loader2 class="text-blue-500 animate-spin size-5" />
					{:else}
						<StopCircle class="text-blue-500 size-5" />
					{/if}
				</div>
				<span class="text-base font-medium mb-2">Stop All Running</span>
				<StatusBadge variant="sky" text={runningContainers.toString()} class="mb-3" />
				<p class="text-xs text-muted-foreground">Stop all running containers</p>
			</button>

			<button
				class="group relative flex flex-col items-center p-5 rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-destructive/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:hover:border-border"
				disabled={!dashboardStates.dockerInfo || isLoading.starting || isLoading.stopping || isLoading.pruning}
				onclick={() => (dashboardStates.isPruneDialogOpen = true)}
			>
				<div class="size-10 rounded-full flex items-center justify-center mb-3 bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
					{#if isLoading.pruning}
						<Loader2 class="text-red-500 animate-spin size-5" />
					{:else}
						<Trash2 class="text-red-500 size-5" />
					{/if}
				</div>
				<span class="text-base font-medium mb-2">Prune System</span>
				<p class="text-xs text-muted-foreground">Remove unused data</p>
			</button>
		</div>
	</section>

	<section>
		<h2 class="text-lg font-semibold tracking-tight mb-4">Resources</h2>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<Card.Root class="border shadow-sm relative flex flex-col">
				<Card.Header class="px-6">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title><a class="font-medium hover:underline" href="/containers">Containers</a></Card.Title>
							<Card.Description class="pb-3">Recent containers</Card.Description>
						</div>
						<Button variant="ghost" size="sm" href="/containers" disabled={!dashboardStates.dockerInfo}>
							View All
							<ArrowRight class="ml-2 size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0 flex-1">
					{#if dashboardStates.containers?.length > 0}
						<div class="flex flex-col h-full">
							<div class="flex-1">
								<UniversalTable
									data={dashboardStates.containers.slice(0, 5).map((c) => ({ ...c, displayName: getContainerDisplayName(c) }))}
									columns={[
										{ accessorKey: 'displayName', header: 'Name' },
										{ accessorKey: 'Image', header: 'Image' },
										{ accessorKey: 'State', header: 'State' },
										{ accessorKey: 'Status', header: 'Status' }
									]}
									features={{
										filtering: false,
										selection: false
									}}
									sort={{
										defaultSort: { id: 'Status', desc: false }
									}}
									pagination={{
										pageSize: 5,
										pageSizeOptions: [5]
									}}
									display={{
										isDashboardTable: true
									}}
								>
									{#snippet rows({ item }: { item: ContainerInfo & { displayName: string } })}
										{@const stateVariant = statusVariantMap[item.State.toLowerCase()]}
										<Table.Cell><a class="font-medium hover:underline" href="/containers/{item.Id}/">{item.displayName}</a></Table.Cell>
										<Table.Cell title={item.Image}>{truncateString(item.Image, 40)}</Table.Cell>
										<Table.Cell><StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.State)} /></Table.Cell>
										<Table.Cell>{item.Status}</Table.Cell>
									{/snippet}
								</UniversalTable>
							</div>
							{#if dashboardStates.containers.length > 5}
								<div class="bg-muted/40 py-2 px-6 text-xs text-muted-foreground border-t">
									Showing 5 of {dashboardStates.containers.length} containers
								</div>
							{/if}
						</div>
					{:else if !dashboardStates.error}
						<div class="flex flex-col items-center justify-center py-10 px-6 text-center">
							<Box class="text-muted-foreground mb-2 opacity-40 size-8" />
							<p class="text-sm text-muted-foreground">No containers found</p>
							<p class="text-xs text-muted-foreground mt-1">Use Docker CLI or another tool to create containers</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root class="border shadow-sm relative flex flex-col">
				<Card.Header class="px-6">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title><a class="font-medium hover:underline" href="/images">Images</a></Card.Title>
							<Card.Description class="pb-3">Top 5 Largest Images</Card.Description>
						</div>
						<Button variant="ghost" size="sm" href="/images" disabled={!dashboardStates.dockerInfo}>
							View All
							<ArrowRight class="ml-2 size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0 flex-1">
					{#if dashboardStates.images?.length > 0}
						<div class="flex flex-col h-full">
							<div class="flex-1">
								<UniversalTable
									data={dashboardStates.images.slice(0, 5)}
									columns={[
										{ accessorKey: 'repo', header: 'Name' },
										{ accessorKey: 'inUse', header: ' ', enableSorting: false },
										{ accessorKey: 'tag', header: 'Tag' },
										{ accessorKey: 'Size', header: 'Size' }
									]}
									features={{
										filtering: false,
										selection: false
									}}
									pagination={{
										pageSize: 5,
										pageSizeOptions: [5]
									}}
									display={{
										isDashboardTable: true
									}}
									sort={{
										defaultSort: { id: 'Size', desc: true }
									}}
								>
									{#snippet rows({ item }: { item: EnhancedImageInfo })}
										<Table.Cell>
											<div class="flex items-center gap-2">
												<div class="flex items-center flex-1">
													<MaturityItem maturity={item.maturity} isLoadingInBackground={!item.maturity} />
													<a class="font-medium hover:underline shrink truncate" href="/images/{item.Id}/">
														{item.repo}
													</a>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											{#if !item.inUse}
												<StatusBadge text="Unused" variant="amber" />
											{:else}
												<StatusBadge text="In Use" variant="green" />
											{/if}
										</Table.Cell>
										<Table.Cell>{item.tag}</Table.Cell>
										<Table.Cell>{formatBytes(item.Size)}</Table.Cell>
									{/snippet}
								</UniversalTable>
							</div>
							{#if dashboardStates.images.length > 5}
								<div class="bg-muted/40 py-2 px-6 text-xs text-muted-foreground border-t">
									Showing 5 of {dashboardStates.images.length} images
								</div>
							{/if}
						</div>
					{:else if !dashboardStates.error}
						<div class="flex flex-col items-center justify-center py-10 px-6 text-center">
							<HardDrive class="text-muted-foreground mb-2 opacity-40 size-8" />
							<p class="text-sm text-muted-foreground">No images found</p>
							<p class="text-xs text-muted-foreground mt-1">Pull images using Docker CLI or another tool</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<section class="border-t pt-4 mt-10">
		<div class="flex justify-between items-center text-muted-foreground text-sm">
			<div class="flex items-center">
				<a href="/settings" class="hover:text-foreground transition-colors" title="Settings">
					<Settings class="size-4" />
					<span class="sr-only">Settings</span>
				</a>
				<span class="mx-2">•</span>
				<a href="https://github.com/ofkm/arcane" target="_blank" rel="noopener noreferrer" class="hover:text-foreground transition-colors" title="GitHub">
					<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="fill-current size-4">
						<title>GitHub</title>
						<path
							d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						/>
					</svg>
					<span class="sr-only">GitHub</span>
				</a>
			</div>
			<div></div>
		</div>
	</section>

	<PruneConfirmationDialog bind:open={dashboardStates.isPruneDialogOpen} isPruning={isLoading.pruning} imagePruneMode={dashboardStates.settings?.pruneMode || 'dangling'} onConfirm={confirmPrune} onCancel={() => (dashboardStates.isPruneDialogOpen = false)} />
</div>
