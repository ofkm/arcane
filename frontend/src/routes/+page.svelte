<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import {
		AlertCircle,
		Box,
		HardDrive,
		Cpu,
		ArrowRight,
		PlayCircle,
		StopCircle,
		Trash2,
		RefreshCw,
		Loader2,
		Monitor
	} from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import {
		capitalizeFirstLetter,
		truncateString,
		shortId,
		parseStatusTime
	} from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { toast } from 'svelte-sonner';
	import PruneConfirmationDialog from '$lib/components/dialogs/prune-confirmation-dialog.svelte';
	import * as Table from '$lib/components/ui/table';
	import { statusVariantMap } from '$lib/types/statuses';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { systemAPI, imageAPI, environmentAPI, settingsAPI } from '$lib/services/api';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import MaturityItem from '$lib/components/maturity-item.svelte';
	import { onMount } from 'svelte';
	import { maturityStore } from '$lib/stores/maturity-store';
	import type { PruneType } from '$lib/types/actions.type';
	import DropdownCard from '$lib/components/dropdown-card.svelte';
	import Meter from '$lib/components/meter.svelte';
	import DockerIcon from '$lib/icons/docker-icon.svelte';
	import GitHubIcon from '$lib/icons/github-icon.svelte';
	import type { SystemStats } from '$lib/models/system-stats';
	import type { ContainerInfo, EnhancedContainerInfo } from '$lib/models/container-info';
	import type { Settings } from '$lib/types/settings.type';

	type EnhancedImageInfo = {
		Id: string;
		RepoTags: string[];
		RepoDigests: string[];
		ParentId: string;
		Created: number;
		Size: number;
		SharedSize: number;
		VirtualSize: number;
		Labels: Record<string, string>;
		Containers: number;
		repo?: string;
		tag?: string;
		inUse?: boolean;
		maturity?: any;
	};

	let { data }: { data: PageData } = $props();

	let dashboardStates = $state({
		dockerInfo: null as any,
		containers: null as ContainerInfo[] | null,
		images: [] as EnhancedImageInfo[],
		settings: null as Settings | null,
		systemStats: null as SystemStats | null,
		error: null as string | null,
		isPruneDialogOpen: false
	});

	let isLoading = $state({
		starting: false,
		stopping: false,
		refreshing: false,
		pruning: false,
		loadingStats: true,
		loadingMaturity: true,
		loadingDockerInfo: true,
		loadingContainers: true,
		loadingImages: true,
		loadingSettings: true
	});

	let liveSystemStats = $state(null as SystemStats | null);
	let statsInterval: NodeJS.Timeout | null = null;
	let hasInitialStatsLoaded = $state(false);

	const runningContainers = $derived(
		dashboardStates.containers?.filter((c: ContainerInfo) => c.State === 'running').length ?? 0
	);

	const stoppedContainers = $derived(
		dashboardStates.containers?.filter((c: ContainerInfo) => c.State === 'exited').length ?? 0
	);

	const totalImageSize = $derived(
		dashboardStates.images?.reduce((sum, image) => sum + (image.Size || 0), 0) ?? 0
	);

	const containerUsagePercent = $derived(
		dashboardStates.containers?.length
			? (runningContainers / dashboardStates.containers.length) * 100
			: 0
	);

	const currentStats = $derived(dashboardStates.systemStats || liveSystemStats);

	function getContainerDisplayName(container: ContainerInfo): string {
		if (container.Names && container.Names.length > 0) {
			return container.Names[0].startsWith('/')
				? container.Names[0].substring(1)
				: container.Names[0];
		}
		return shortId(container.Id);
	}

	async function loadInitialData() {
		isLoading.loadingDockerInfo = true;
		isLoading.loadingContainers = true;
		isLoading.loadingImages = true;
		isLoading.loadingSettings = true;
		dashboardStates.error = null;

		const [dockerInfoResult, containersResult, imagesResult, settingsResult] =
			await Promise.allSettled([
				tryCatch(systemAPI.getDockerInfo()),
				tryCatch(environmentAPI.getContainers()),
				tryCatch(environmentAPI.getImages()),
				tryCatch(settingsAPI.getSettings())
			]);

		if (dockerInfoResult.status === 'fulfilled' && !dockerInfoResult.value.error) {
			dashboardStates.dockerInfo = dockerInfoResult.value.data;
		} else {
			console.error(
				'Failed to load Docker Info:',
				dockerInfoResult.status === 'rejected'
					? dockerInfoResult.reason
					: dockerInfoResult.value.error
			);
			dashboardStates.error = dashboardStates.error || 'Failed to load Docker Info.';
		}
		isLoading.loadingDockerInfo = false;

		if (containersResult.status === 'fulfilled' && !containersResult.value.error) {
			dashboardStates.containers = containersResult.value.data;
		} else {
			console.error(
				'Failed to load Containers:',
				containersResult.status === 'rejected'
					? containersResult.reason
					: containersResult.value.error
			);
			dashboardStates.containers = [];
			dashboardStates.error = dashboardStates.error || 'Failed to load Containers.';
		}
		isLoading.loadingContainers = false;

		if (imagesResult.status === 'fulfilled' && !imagesResult.value.error) {
			dashboardStates.images = imagesResult.value.data;
		} else {
			console.error(
				'Failed to load Images:',
				imagesResult.status === 'rejected' ? imagesResult.reason : imagesResult.value.error
			);
			dashboardStates.images = [];
			dashboardStates.error = dashboardStates.error || 'Failed to load Images.';
		}
		isLoading.loadingImages = false;

		if (settingsResult.status === 'fulfilled' && !settingsResult.value.error) {
			dashboardStates.settings = settingsResult.value.data;
		} else {
			console.error(
				'Failed to load Settings:',
				settingsResult.status === 'rejected' ? settingsResult.reason : settingsResult.value.error
			);
			dashboardStates.error = dashboardStates.error || 'Failed to load Settings.';
		}
		isLoading.loadingSettings = false;

		if (dashboardStates.images && dashboardStates.images.length > 0) {
			loadTopImagesMaturity();
		} else {
			isLoading.loadingMaturity = false;
		}
	}

	async function fetchLiveSystemStats() {
		if (!hasInitialStatsLoaded) {
			isLoading.loadingStats = true;
		}

		try {
			const response = await systemAPI.getStats();

			let stats: SystemStats | null = null;

			if (response && typeof response === 'object') {
				if ('success' in response && response.success && 'data' in response) {
					stats = response.data as SystemStats;
				} else if ('cpuUsage' in response) {
					stats = response as SystemStats;
				}
			}

			if (stats) {
				liveSystemStats = stats;
				dashboardStates.systemStats = stats;
			} else {
				console.warn('Invalid system stats response format:', response);
			}
		} catch (error) {
			console.error('Failed to fetch live system stats:', error);
		} finally {
			if (!hasInitialStatsLoaded) {
				isLoading.loadingStats = false;
				hasInitialStatsLoaded = true;
			}
		}
	}

	async function loadTopImagesMaturity() {
		if (!dashboardStates.images || dashboardStates.images.length === 0) {
			isLoading.loadingMaturity = false;
			return;
		}

		isLoading.loadingMaturity = true;

		const topImageIds = [...dashboardStates.images]
			.sort((a, b) => (b.Size || 0) - (a.Size || 0))
			.slice(0, 5)
			.filter((img) => img.repo !== '<none>' && img.tag !== '<none>')
			.map((img) => img.Id);

		if (topImageIds.length === 0) {
			isLoading.loadingMaturity = false;
			return;
		}

		try {
			const BATCH_SIZE = 1;
			for (let i = 0; i < topImageIds.length; i += BATCH_SIZE) {
				const batch = topImageIds.slice(i, i + BATCH_SIZE);
				await imageAPI.checkMaturityBatch(batch);

				dashboardStates.images = dashboardStates.images.map((image) => {
					const storedMaturity = $maturityStore.maturityData[image.Id];
					return {
						...image,
						maturity: storedMaturity !== undefined ? storedMaturity : image.maturity
					};
				});

				if (i + BATCH_SIZE < topImageIds.length) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}
		} catch (error) {
			console.error('Error loading maturity data for dashboard images:', error);
		} finally {
			isLoading.loadingMaturity = false;
		}
	}

	onMount(() => {
		let mounted = true;

		loadInitialData();
		fetchLiveSystemStats();

		if (!statsInterval) {
			statsInterval = setInterval(() => {
				if (mounted) {
					fetchLiveSystemStats();
				}
			}, 5000);
		}

		return () => {
			mounted = false;
			if (statsInterval) {
				clearInterval(statsInterval);
				statsInterval = null;
			}
		};
	});

	async function refreshData() {
		if (isLoading.refreshing) return;
		isLoading.refreshing = true;
		await Promise.all([loadInitialData(), fetchLiveSystemStats()]);
		isLoading.refreshing = false;
	}

	async function handleStartAll() {
		if (isLoading.starting || !dashboardStates.dockerInfo || stoppedContainers === 0) return;
		isLoading.starting = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(systemAPI.startAllStoppedContainers()),
			message: 'Failed to Start All Containers',
			setLoadingState: (value) => (isLoading.starting = value),
			onSuccess: async () => {
				toast.success('All Containers Started Successfully.');
				await loadInitialData();
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
						result: await tryCatch(systemAPI.stopAllContainers()),
						message: 'Failed to Stop All Running Containers',
						setLoadingState: (value) => (isLoading.stopping = value),
						onSuccess: async () => {
							toast.success('All Containers Stopped Successfully.');
							await loadInitialData();
						}
					});
				}
			}
		});
	}

	async function confirmPrune(selectedTypes: PruneType[]) {
		if (isLoading.pruning || selectedTypes.length === 0) return;
		isLoading.pruning = true;

		const pruneOptions = {
			containers: selectedTypes.includes('containers'),
			images: selectedTypes.includes('images'),
			volumes: selectedTypes.includes('volumes'),
			networks: selectedTypes.includes('networks'),
			dangling: dashboardStates.settings?.pruneMode === 'dangling'
		};

		handleApiResultWithCallbacks({
			result: await tryCatch(systemAPI.pruneAll(pruneOptions)),
			message: `Failed to Prune ${selectedTypes.join(', ')}`,
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async () => {
				dashboardStates.isPruneDialogOpen = false;
				const formattedTypes = selectedTypes.map((type) => capitalizeFirstLetter(type)).join(', ');
				toast.success(
					`${formattedTypes} ${selectedTypes.length > 1 ? 'were' : 'was'} pruned successfully.`
				);
				await loadInitialData();
			}
		});
	}
</script>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground mt-1 text-sm">Overview of your Container Environment</p>
		</div>
		<Button
			variant="outline"
			size="sm"
			class="arcane-button-restart h-9"
			onclick={refreshData}
			disabled={isLoading.refreshing ||
				isLoading.starting ||
				isLoading.stopping ||
				isLoading.pruning}
		>
			{#if isLoading.refreshing}
				<Loader2 class="mr-2 size-4 animate-spin" />
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
		<DropdownCard
			id="system-overview"
			title="System Overview"
			description="Hardware and Docker engine information"
			icon={Monitor}
			defaultExpanded={true}
		>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<!-- Containers Card -->
				<Card.Root class="overflow-hidden">
					<Card.Content class="p-6">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-green-500/10 p-2.5">
									<Box class="size-5 text-green-500" />
								</div>
								<div>
									<p class="text-muted-foreground text-sm font-medium">Containers</p>
									{#if isLoading.loadingContainers}
										<div class="bg-muted h-6 w-16 animate-pulse rounded mt-1"></div>
									{:else}
										<p class="text-2xl font-bold">
											{runningContainers}
											<span class="text-muted-foreground text-sm font-normal"
												>/ {dashboardStates.containers?.length || 0}</span
											>
										</p>
									{/if}
								</div>
							</div>
						</div>

						{#if isLoading.loadingContainers}
							<div class="bg-muted h-2 w-full animate-pulse rounded mb-6"></div>
						{:else if dashboardStates.containers?.length}
							<div class="mb-6">
								<Meter
									label="Active Containers"
									valueLabel="{runningContainers} running"
									value={runningContainers}
									max={dashboardStates.containers.length}
									variant={containerUsagePercent > 80 ? 'warning' : 'success'}
									size="sm"
								/>
							</div>
						{/if}

						<div class="space-y-3 border-t pt-4">
							<div class="flex items-center gap-2">
								<DockerIcon class="text-muted-foreground size-4" />
								<p class="text-muted-foreground text-sm font-medium">Docker Engine</p>
							</div>
							{#if isLoading.loadingDockerInfo}
								<div class="grid grid-cols-2 gap-3 text-xs">
									<div class="space-y-1">
										<div class="bg-muted h-3 w-16 animate-pulse rounded"></div>
										<div class="bg-muted h-4 w-20 animate-pulse rounded"></div>
									</div>
									<div class="space-y-1">
										<div class="bg-muted h-3 w-12 animate-pulse rounded"></div>
										<div class="bg-muted h-4 w-16 animate-pulse rounded"></div>
									</div>
								</div>
							{:else}
								<div class="grid grid-cols-2 gap-3 text-xs">
									<div>
										<p class="text-muted-foreground">Version</p>
										<p class="font-medium">{dashboardStates.dockerInfo?.version || 'Unknown'}</p>
									</div>
									<div>
										<p class="text-muted-foreground">OS</p>
										<p class="font-medium">
											{dashboardStates.dockerInfo?.os ||
												dashboardStates.systemStats?.platform ||
												'Unknown'}
										</p>
									</div>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Storage Card -->
				<Card.Root class="overflow-hidden">
					<Card.Content class="p-6">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-blue-500/10 p-2.5">
									<HardDrive class="size-5 text-blue-500" />
								</div>
								<div>
									<p class="text-muted-foreground text-sm font-medium">Storage</p>
									{#if isLoading.loadingDockerInfo}
										<div class="bg-muted h-6 w-12 animate-pulse rounded mt-1"></div>
									{:else}
										<p class="text-2xl font-bold">{dashboardStates.dockerInfo?.images || 0}</p>
										<p class="text-muted-foreground text-xs">Docker images</p>
									{/if}
								</div>
							</div>
						</div>

						{#if isLoading.loadingStats && !hasInitialStatsLoaded}
							<div class="py-6 text-center">
								<Loader2 class="text-muted-foreground mx-auto mb-2 size-6 animate-spin" />
								<p class="text-muted-foreground text-sm">Loading storage data...</p>
							</div>
						{:else if currentStats?.diskTotal && currentStats?.diskUsage !== undefined}
							{@const storagePercent = Math.min(
								Math.max((currentStats.diskUsage / currentStats.diskTotal) * 100, 0),
								100
							)}
							<div class="mb-4">
								<Meter
									label="System Storage"
									valueLabel="{storagePercent.toFixed(1)}%"
									value={storagePercent}
									max={100}
									variant={storagePercent > 85
										? 'destructive'
										: storagePercent > 70
											? 'warning'
											: 'success'}
									size="sm"
								/>
							</div>
							<div class="text-muted-foreground space-y-1 text-xs">
								<div class="flex justify-between">
									<span>Used:</span>
									<span class="font-medium">{formatBytes(currentStats.diskUsage)}</span>
								</div>
								<div class="flex justify-between">
									<span>Total:</span>
									<span class="font-medium">{formatBytes(currentStats.diskTotal)}</span>
								</div>
								{#if totalImageSize > 0}
									<div class="border-border/50 flex justify-between border-t pt-1">
										<span>Docker Images:</span>
										<span class="font-medium">{formatBytes(totalImageSize)}</span>
									</div>
								{/if}
							</div>
						{:else if totalImageSize > 0}
							<div class="mb-4">
								<div class="py-4 text-center">
									<p class="text-muted-foreground text-sm">System storage data unavailable</p>
								</div>
							</div>
							<div class="text-muted-foreground text-xs">
								<div class="flex justify-between">
									<span>Docker Images:</span>
									<span class="font-medium">{formatBytes(totalImageSize)}</span>
								</div>
							</div>
						{:else}
							<div class="py-6 text-center">
								<p class="text-muted-foreground text-sm">No storage data available</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Hardware Card -->
				<Card.Root class="overflow-hidden">
					<Card.Content class="p-6">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-purple-500/10 p-2.5">
									<Cpu class="size-5 text-purple-500" />
								</div>
								<div>
									<p class="text-muted-foreground text-sm font-medium">Hardware</p>
									{#if isLoading.loadingStats && !hasInitialStatsLoaded}
										<div class="bg-muted h-4 w-24 animate-pulse rounded mt-1 text-xs"></div>
									{:else if currentStats}
										<div class="text-muted-foreground mt-1 flex items-center gap-4 text-xs">
											<span>{currentStats.cpuCount || 'N/A'} cores</span>
											<span
												>{currentStats.memoryTotal
													? formatBytes(currentStats.memoryTotal, 0)
													: 'N/A'}</span
											>
										</div>
										{#if currentStats.hostname}
											<p class="text-muted-foreground mt-1 text-xs">{currentStats.hostname}</p>
										{/if}
									{:else}
										<div class="text-muted-foreground mt-1 text-xs">No data available</div>
									{/if}
								</div>
							</div>
						</div>

						{#if isLoading.loadingStats && !hasInitialStatsLoaded}
							<div class="py-6 text-center">
								<Loader2 class="text-muted-foreground mx-auto mb-2 size-6 animate-spin" />
								<p class="text-muted-foreground text-sm">Loading system stats...</p>
							</div>
						{:else if currentStats}
							{@const cpuPercent = Math.min(Math.max(currentStats.cpuUsage, 0), 100)}
							{@const memoryPercent = Math.min(
								Math.max((currentStats.memoryUsage / currentStats.memoryTotal) * 100, 0),
								100
							)}
							<div class="space-y-4">
								<Meter
									label="CPU Usage"
									valueLabel="{cpuPercent.toFixed(1)}%"
									value={cpuPercent}
									max={100}
									variant={cpuPercent > 80
										? 'destructive'
										: cpuPercent > 60
											? 'warning'
											: 'success'}
									size="sm"
								/>

								<Meter
									label="Memory Usage"
									valueLabel="{memoryPercent.toFixed(1)}%"
									value={memoryPercent}
									max={100}
									variant={memoryPercent > 80
										? 'destructive'
										: memoryPercent > 60
											? 'warning'
											: 'success'}
									size="sm"
								/>
							</div>
							<div class="text-muted-foreground space-y-1 pt-3 text-xs">
								{#if currentStats.architecture}
									<div class="flex justify-between">
										<span>Architecture:</span>
										<span class="font-medium">{currentStats.architecture}</span>
									</div>
								{/if}
								{#if currentStats.platform}
									<div class="flex justify-between">
										<span>Platform:</span>
										<span class="font-medium capitalize">{currentStats.platform}</span>
									</div>
								{/if}
							</div>
						{:else}
							<div class="py-6 text-center">
								<p class="text-muted-foreground text-sm">System stats unavailable</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</DropdownCard>
	</section>

	<section>
		<h2 class="mb-4 text-lg font-semibold tracking-tight">Quick Actions</h2>
		{#if isLoading.loadingDockerInfo}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
				{#each Array(3) as _}
					<div class="bg-card flex flex-col items-center rounded-xl border p-6">
						<div class="bg-muted mb-4 size-12 animate-pulse rounded-full"></div>
						<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
						<div class="bg-muted mt-2 h-3 w-16 animate-pulse rounded"></div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
				<button
					class="group bg-card relative flex flex-col items-center rounded-xl border p-6 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
					disabled={!dashboardStates.dockerInfo ||
						stoppedContainers === 0 ||
						isLoading.starting ||
						isLoading.stopping ||
						isLoading.pruning}
					onclick={handleStartAll}
				>
					<div
						class="mb-4 flex size-12 items-center justify-center rounded-full bg-green-500/10 transition-colors group-hover:bg-green-500/20"
					>
						{#if isLoading.starting}
							<Loader2 class="size-6 animate-spin text-green-500" />
						{:else}
							<PlayCircle class="size-6 text-green-500" />
						{/if}
					</div>
					<span class="text-center text-base font-medium">Start All Stopped</span>
					<span class="text-muted-foreground mt-1 text-sm">{stoppedContainers} containers</span>
				</button>

				<button
					class="group bg-card relative flex flex-col items-center rounded-xl border p-6 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
					disabled={!dashboardStates.dockerInfo ||
						runningContainers === 0 ||
						isLoading.starting ||
						isLoading.stopping ||
						isLoading.pruning}
					onclick={handleStopAll}
				>
					<div
						class="mb-4 flex size-12 items-center justify-center rounded-full bg-blue-500/10 transition-colors group-hover:bg-blue-500/20"
					>
						{#if isLoading.stopping}
							<Loader2 class="size-6 animate-spin text-blue-500" />
						{:else}
							<StopCircle class="size-6 text-blue-500" />
						{/if}
					</div>
					<span class="text-center text-base font-medium">Stop All Running</span>
					<span class="text-muted-foreground mt-1 text-sm">{runningContainers}</span>
				</button>

				<button
					class="group bg-card hover:border-destructive/50 disabled:hover:border-border relative flex flex-col items-center rounded-xl border p-6 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
					disabled={!dashboardStates.dockerInfo ||
						isLoading.starting ||
						isLoading.stopping ||
						isLoading.pruning}
					onclick={() => (dashboardStates.isPruneDialogOpen = true)}
				>
					<div
						class="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 transition-colors group-hover:bg-red-500/20"
					>
						{#if isLoading.pruning}
							<Loader2 class="size-6 animate-spin text-red-500" />
						{:else}
							<Trash2 class="size-6 text-red-500" />
						{/if}
					</div>
					<span class="text-center text-base font-medium">Prune System</span>
					<span class="text-muted-foreground mt-1 text-sm">Clean unused resources</span>
				</button>
			</div>
		{/if}
	</section>

	<section>
		<h2 class="mb-4 text-lg font-semibold tracking-tight">Resources</h2>
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Containers Table Card -->
			<Card.Root class="relative flex flex-col border shadow-sm">
				<Card.Header class="px-6">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title
								><a class="font-medium hover:underline" href="/containers">Containers</a
								></Card.Title
							>
							<Card.Description class="pb-3">Recent containers</Card.Description>
						</div>
						<Button
							variant="ghost"
							size="sm"
							href="/containers"
							disabled={isLoading.loadingContainers || !dashboardStates.dockerInfo}
						>
							View All
							<ArrowRight class="ml-2 size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="flex-1 p-0">
					{#if isLoading.loadingContainers}
						<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
							<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
							<p class="text-lg font-medium">Loading Containers...</p>
							<p class="text-muted-foreground mt-1 text-sm">
								Please wait while we fetch containers
							</p>
						</div>
					{:else if dashboardStates.containers && dashboardStates.containers.length > 0}
						<div class="flex h-full flex-col">
							<div class="flex-1">
								<UniversalTable
									data={dashboardStates.containers.slice(0, 5).map(
										(c): EnhancedContainerInfo => ({
											...c,
											displayName: getContainerDisplayName(c),
											statusSortValue: parseStatusTime(c.Status)
										})
									)}
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
									{#snippet rows({ item }: { item: EnhancedContainerInfo })}
										{@const stateVariant = statusVariantMap[item.State.toLowerCase()]}
										<Table.Cell>
											<a class="font-medium hover:underline" href="/containers/{item.Id}/">
												{item.displayName}
											</a>
										</Table.Cell>
										<Table.Cell title={item.Image}>
											{truncateString(item.Image, 40)}
										</Table.Cell>
										<Table.Cell>
											<StatusBadge
												variant={stateVariant}
												text={capitalizeFirstLetter(item.State)}
											/>
										</Table.Cell>
										<Table.Cell>{item.Status}</Table.Cell>
									{/snippet}
								</UniversalTable>
							</div>
							{#if dashboardStates.containers.length > 5}
								<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
									Showing 5 of {dashboardStates.containers.length} containers
								</div>
							{/if}
						</div>
					{:else if !dashboardStates.error}
						<div class="flex flex-col items-center justify-center px-6 py-10 text-center">
							<Box class="text-muted-foreground mb-2 size-8 opacity-40" />
							<p class="text-muted-foreground text-sm">No containers found</p>
							<p class="text-muted-foreground mt-1 text-xs">
								Use Docker CLI or another tool to create containers
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Images Table Card -->
			<Card.Root class="relative flex flex-col border shadow-sm">
				<Card.Header class="px-6">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title
								><a class="font-medium hover:underline" href="/images">Images</a></Card.Title
							>
							<Card.Description class="pb-3">Top 5 Largest Images</Card.Description>
						</div>
						<Button
							variant="ghost"
							size="sm"
							href="/images"
							disabled={isLoading.loadingImages || !dashboardStates.dockerInfo}
						>
							View All
							<ArrowRight class="ml-2 size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="flex-1 p-0">
					{#if isLoading.loadingImages}
						<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
							<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
							<p class="text-lg font-medium">Loading Images...</p>
							<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch images</p>
						</div>
					{:else if dashboardStates.images?.length > 0}
						<div class="flex h-full flex-col">
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
												<div class="flex flex-1 items-center">
													{#if isLoading.loadingMaturity}
														<div class="bg-muted size-4 animate-pulse rounded-full mr-2"></div>
													{:else}
														<MaturityItem
															maturity={item.maturity}
															isLoadingInBackground={!item.maturity}
															imageId={item.Id}
														/>
													{/if}
													<a
														class="shrink truncate font-medium hover:underline"
														href="/images/{item.Id}/"
													>
														{#if item.repo && item.repo !== '<none>'}
															{item.repo}
														{:else if item.RepoTags && item.RepoTags.length > 0 && item.RepoTags[0] !== '<none>:<none>'}
															{item.RepoTags[0].split(':')[0]}
														{:else}
															{item.Id.substring(7, 19)}
														{/if}
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
										<Table.Cell>
											{#if item.tag && item.tag !== '<none>'}
												{item.tag}
											{:else if item.RepoTags && item.RepoTags.length > 0 && item.RepoTags[0] !== '<none>:<none>'}
												{item.RepoTags[0].split(':')[1] || 'latest'}
											{:else}
												&lt;none&gt;
											{/if}
										</Table.Cell>
										<Table.Cell>{formatBytes(item.Size)}</Table.Cell>
									{/snippet}
								</UniversalTable>
							</div>
							{#if dashboardStates.images.length > 5}
								<div class="bg-muted/40 text-muted-foreground border-t px-6 py-2 text-xs">
									Showing 5 of {dashboardStates.images.length} images
								</div>
							{/if}
						</div>
					{:else if !dashboardStates.error}
						<div class="flex flex-col items-center justify-center px-6 py-10 text-center">
							<HardDrive class="text-muted-foreground mb-2 size-8 opacity-40" />
							<p class="text-muted-foreground text-sm">No images found</p>
							<p class="text-muted-foreground mt-1 text-xs">
								Pull images using Docker CLI or another tool
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<section class="mt-10 border-t pt-4">
		<div class="text-muted-foreground flex items-center justify-between text-sm">
			<div class="flex items-center">
				<a
					href="https://github.com/ofkm/arcane"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground transition-colors"
					title="GitHub"
				>
					<GitHubIcon class="size-4 fill-current" />
					<span class="sr-only">GitHub</span>
				</a>
			</div>
			<div></div>
		</div>
	</section>

	<PruneConfirmationDialog
		bind:open={dashboardStates.isPruneDialogOpen}
		isPruning={isLoading.pruning}
		imagePruneMode={(dashboardStates.settings?.pruneMode as 'dangling' | 'all') || 'dangling'}
		onConfirm={confirmPrune}
		onCancel={() => (dashboardStates.isPruneDialogOpen = false)}
	/>
</div>
