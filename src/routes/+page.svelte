<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { AlertCircle, Box, HardDrive, Cpu, ArrowRight, PlayCircle, StopCircle, Trash2, Settings, RefreshCw, Loader2, Monitor } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { capitalizeFirstLetter, truncateString, shortId, parseStatusTime } from '$lib/utils/string.utils';
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
	import Meter from '$lib/components/meter.svelte';
	import DockerIcon from '$lib/icons/docker-icon.svelte';
	import GitHubIcon from '$lib/icons/github-icon.svelte';

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
	const containerUsagePercent = $derived(dashboardStates.containers?.length ? (runningContainers / dashboardStates.containers.length) * 100 : 0);

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
	// Add server stats state
	let serverStats = $state<{
		cpuUsage: number;
		memoryUsage: number;
		memoryTotal: number;
		diskUsage?: number;
		diskTotal?: number;
	} | null>(null);

	// Add server stats fetching
	async function fetchServerStats() {
		try {
			const response = await fetch('/api/system/stats');
			if (response.ok) {
				serverStats = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch server stats:', error);
		}
	}

	// Fetch server stats on mount and refresh
	onMount(() => {
		// Run async operations without blocking the mount
		(async () => {
			await loadTopImagesMaturity();
			await fetchServerStats();
		})();

		// Set up periodic updates for server stats
		const interval = setInterval(fetchServerStats, 5000); // Update every 5 seconds
		return () => clearInterval(interval);
	});

	async function refreshData() {
		if (isLoading.refreshing) return;
		isLoading.refreshing = true;
		try {
			await invalidateAll();
			await fetchServerStats(); // Also refresh server stats
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
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Containers & Docker Info Card -->
				<Card.Root class="overflow-hidden">
					<Card.Content class="p-6">
						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="bg-green-500/10 p-2.5 rounded-lg">
									<Box class="text-green-500 size-5" />
								</div>
								<div>
									<p class="text-sm font-medium text-muted-foreground">Containers</p>
									<p class="text-2xl font-bold">
										{runningContainers}
										<span class="text-sm font-normal text-muted-foreground">/ {dashboardStates.containers?.length || 0}</span>
									</p>
								</div>
							</div>
						</div>

						{#if dashboardStates.containers?.length}
							<div class="mb-6">
								<Meter label="Active Containers" valueLabel="{runningContainers} running" value={containerUsagePercent} max={100} variant={containerUsagePercent > 80 ? 'warning' : 'default'} size="sm" />
							</div>
						{/if}

						<!-- Docker Engine Info -->
						<div class="pt-4 border-t space-y-3">
							<div class="flex items-center gap-2">
								<DockerIcon class="text-muted-foreground size-4" />
								<p class="text-sm font-medium text-muted-foreground">Docker Engine</p>
							</div>
							<div class="grid grid-cols-2 gap-3 text-xs">
								<div>
									<p class="text-muted-foreground">Version</p>
									<p class="font-medium">{dashboardStates.dockerInfo?.ServerVersion || 'Unknown'}</p>
								</div>
								<div>
									<p class="text-muted-foreground">OS</p>
									<p class="font-medium">{dashboardStates.dockerInfo?.OperatingSystem?.split(' ')[0] || 'Unknown'}</p>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Images & System Storage Card -->
				<Card.Root class="overflow-hidden">
					<Card.Content class="p-6">
						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="bg-blue-500/10 p-2.5 rounded-lg">
									<HardDrive class="text-blue-500 size-5" />
								</div>
								<div>
									<p class="text-sm font-medium text-muted-foreground">Storage</p>
									<p class="text-2xl font-bold">{dashboardStates.dockerInfo?.Images || 0}</p>
									<p class="text-xs text-muted-foreground">Docker images</p>
								</div>
							</div>
						</div>

						{#if serverStats?.diskTotal && serverStats?.diskUsage !== undefined}
							{@const storagePercent = Math.min(Math.max((serverStats.diskUsage / serverStats.diskTotal) * 100, 0), 100)}
							<div class="mb-4">
								<Meter label="System Storage" valueLabel="{storagePercent.toFixed(1)}%" value={storagePercent} max={100} variant={storagePercent > 85 ? 'destructive' : storagePercent > 70 ? 'warning' : 'default'} size="sm" />
							</div>
							<div class="space-y-1 text-xs text-muted-foreground">
								<div class="flex justify-between">
									<span>Used:</span>
									<span class="font-medium">{formatBytes(serverStats.diskUsage)}</span>
								</div>
								<div class="flex justify-between">
									<span>Total:</span>
									<span class="font-medium">{formatBytes(serverStats.diskTotal)}</span>
								</div>
								{#if totalImageSize > 0}
									<div class="flex justify-between pt-1 border-t border-border/50">
										<span>Docker Images:</span>
										<span class="font-medium">{formatBytes(totalImageSize)}</span>
									</div>
								{/if}
							</div>
						{:else if totalImageSize > 0}
							<!-- Fallback to Docker images only if system storage unavailable -->
							<div class="mb-4">
								<div class="text-center py-4">
									<p class="text-sm text-muted-foreground">System storage data unavailable</p>
								</div>
							</div>
							<div class="text-xs text-muted-foreground">
								<div class="flex justify-between">
									<span>Docker Images:</span>
									<span class="font-medium">{formatBytes(totalImageSize)}</span>
								</div>
							</div>
						{:else if dashboardStates.dockerInfo?.Images === 0}
							<div class="text-center py-6">
								<p class="text-sm text-muted-foreground">No images stored</p>
							</div>
						{:else}
							<div class="text-center py-6">
								<p class="text-sm text-muted-foreground">Loading storage data...</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Hardware & Performance Card -->
				<Card.Root class="overflow-hidden">
					<Card.Content class="p-6">
						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="bg-purple-500/10 p-2.5 rounded-lg">
									<Cpu class="text-purple-500 size-5" />
								</div>
								<div>
									<p class="text-sm font-medium text-muted-foreground">Hardware</p>
									<div class="flex items-center gap-4 text-xs text-muted-foreground mt-1">
										<span>{dashboardStates.dockerInfo?.NCPU || 'N/A'} cores</span>
										<span>{dashboardStates.dockerInfo?.MemTotal ? formatBytes(dashboardStates.dockerInfo.MemTotal, 0) : 'N/A'}</span>
									</div>
								</div>
							</div>
						</div>

						{#if serverStats}
							{@const cpuPercent = Math.min(Math.max(serverStats.cpuUsage, 0), 100)}
							{@const memoryPercent = Math.min(Math.max((serverStats.memoryUsage / serverStats.memoryTotal) * 100, 0), 100)}
							<div class="space-y-4">
								<Meter label="CPU Usage" valueLabel="{cpuPercent.toFixed(1)}%" value={cpuPercent} max={100} variant={cpuPercent > 80 ? 'destructive' : cpuPercent > 60 ? 'warning' : 'success'} size="sm" />

								<Meter label="Memory Usage" valueLabel="{memoryPercent.toFixed(1)}%" value={memoryPercent} max={100} variant={memoryPercent > 80 ? 'destructive' : memoryPercent > 60 ? 'warning' : 'success'} size="sm" />
							</div>
							<p class="text-xs text-muted-foreground mt-3">
								{dashboardStates.dockerInfo?.Architecture || 'Unknown arch'}
							</p>
						{:else}
							<div class="text-center py-6">
								<p class="text-sm text-muted-foreground">Loading stats...</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</DropdownCard>
	</section>

	<section>
		<h2 class="text-lg font-semibold tracking-tight mb-4">Quick Actions</h2>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
			<button class="group relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm" disabled={!dashboardStates.dockerInfo || stoppedContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning} onclick={handleStartAll}>
				<div class="size-12 rounded-full flex items-center justify-center mb-4 bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
					{#if isLoading.starting}
						<Loader2 class="text-green-500 animate-spin size-6" />
					{:else}
						<PlayCircle class="text-green-500 size-6" />
					{/if}
				</div>
				<span class="text-base font-medium text-center">Start All Stopped</span>
				<span class="text-sm text-muted-foreground mt-1">{stoppedContainers} containers</span>
			</button>

			<button class="group relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm" disabled={!dashboardStates.dockerInfo || runningContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning} onclick={handleStopAll}>
				<div class="size-12 rounded-full flex items-center justify-center mb-4 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
					{#if isLoading.stopping}
						<Loader2 class="text-blue-500 animate-spin size-6" />
					{:else}
						<StopCircle class="text-blue-500 size-6" />
					{/if}
				</div>
				<span class="text-base font-medium text-center">Stop All Running</span>
				<span class="text-sm text-muted-foreground mt-1">{runningContainers}</span>
			</button>

			<button
				class="group relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-destructive/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:hover:border-border"
				disabled={!dashboardStates.dockerInfo || isLoading.starting || isLoading.stopping || isLoading.pruning}
				onclick={() => (dashboardStates.isPruneDialogOpen = true)}
			>
				<div class="size-12 rounded-full flex items-center justify-center mb-4 bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
					{#if isLoading.pruning}
						<Loader2 class="text-red-500 animate-spin size-6" />
					{:else}
						<Trash2 class="text-red-500 size-6" />
					{/if}
				</div>
				<span class="text-base font-medium text-center">Prune System</span>
				<span class="text-sm text-muted-foreground mt-1">Clean unused resources</span>
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
									data={dashboardStates.containers.slice(0, 5).map((c) => ({ ...c, displayName: getContainerDisplayName(c), statusSortValue: parseStatusTime(c.Status) }))}
									columns={[
										{ accessorKey: 'displayName', header: 'Name' },
										{ accessorKey: 'Image', header: 'Image' },
										{ accessorKey: 'State', header: 'State' },
										{ accessorKey: 'statusSortValue', header: 'Status' }
									]}
									features={{
										filtering: false,
										selection: false
									}}
									sort={{
										defaultSort: { id: 'statusSortValue', desc: false }
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
									data={dashboardStates.images
										.slice()
										.sort((a, b) => (b.Size || 0) - (a.Size || 0))
										.slice(0, 5)}
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
					<GitHubIcon class="fill-current size-4" />
					<span class="sr-only">GitHub</span>
				</a>
			</div>
			<div></div>
		</div>
	</section>

	<PruneConfirmationDialog bind:open={dashboardStates.isPruneDialogOpen} isPruning={isLoading.pruning} imagePruneMode={dashboardStates.settings?.pruneMode || 'dangling'} onConfirm={confirmPrune} onCancel={() => (dashboardStates.isPruneDialogOpen = false)} />
</div>
