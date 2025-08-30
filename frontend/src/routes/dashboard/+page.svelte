<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import BoxIcon from '@lucide/svelte/icons/box';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import MemoryStickIcon from '@lucide/svelte/icons/memory-stick';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import ContainerIcon from '@lucide/svelte/icons/container';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CirclePlayIcon from '@lucide/svelte/icons/circle-play';
	import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { toast } from 'svelte-sonner';
	import PruneConfirmationDialog from '$lib/components/dialogs/prune-confirmation-dialog.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { systemAPI, settingsAPI } from '$lib/services/api';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { onMount } from 'svelte';
	import DropdownCard from '$lib/components/dropdown-card.svelte';
	import MeterMetric from '$lib/components/meter-metric.svelte';
	import DockerIcon from '$lib/icons/docker-icon.svelte';
	import type { SystemStats } from '$lib/types/system-stats.type';
	import DashboardContainerTable from './dash-container-table.svelte';
	import DashboardImageTable from './dash-image-table.svelte';

	let { data } = $props();
	let containers = $state(data.containers);
	let images = $state(data.images);
	let dockerInfo = $state(data.dockerInfo);

	let dashboardStates = $state({
		dockerInfo: data.dockerInfo,
		settings: data.settings,
		systemStats: null as SystemStats | null,
		isPruneDialogOpen: false
	});

	type PruneType = 'containers' | 'images' | 'networks' | 'volumes';

	let isLoading = $state({
		starting: false,
		stopping: false,
		refreshing: false,
		pruning: false,
		loadingStats: true,
		loadingDockerInfo: false,
		loadingImages: false
	});

	let liveSystemStats = $state(null as SystemStats | null);
	let statsInterval: NodeJS.Timeout | null = null;
	let hasInitialStatsLoaded = $state(false);

	let historicalData = $state({
		cpu: [] as Array<{ date: Date; value: number }>,
		memory: [] as Array<{ date: Date; value: number }>,
		disk: [] as Array<{ date: Date; value: number }>,
		containers: [] as Array<{ date: Date; value: number }>
	});

	const stoppedContainers = $derived(containers.data.filter((s) => s.state != 'running').length);
	const totalContainers = $derived(containers.pagination.totalItems);
	const currentStats = $derived(dashboardStates.systemStats || liveSystemStats);

	function addToHistoricalData(stats: SystemStats) {
		const now = new Date();
		const maxPoints = 20;

		if (stats.cpuUsage !== undefined) {
			historicalData.cpu.push({ date: now, value: stats.cpuUsage });
			if (historicalData.cpu.length > maxPoints) {
				historicalData.cpu = historicalData.cpu.slice(-maxPoints);
			}
		}

		if (stats.memoryUsage !== undefined && stats.memoryTotal !== undefined) {
			const memoryPercent = (stats.memoryUsage / stats.memoryTotal) * 100;
			historicalData.memory.push({ date: now, value: memoryPercent });
			if (historicalData.memory.length > maxPoints) {
				historicalData.memory = historicalData.memory.slice(-maxPoints);
			}
		}

		if (stats.diskUsage !== undefined && stats.diskTotal !== undefined) {
			const diskPercent = (stats.diskUsage / stats.diskTotal) * 100;
			historicalData.disk.push({ date: now, value: diskPercent });
			if (historicalData.disk.length > maxPoints) {
				historicalData.disk = historicalData.disk.slice(-maxPoints);
			}
		}

		historicalData.containers.push({ date: now, value: dockerInfo!.containersRunning });
		if (historicalData.containers.length > maxPoints) {
			historicalData.containers = historicalData.containers.slice(-maxPoints);
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
				addToHistoricalData(stats);
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

	async function refreshData() {
		if (isLoading.refreshing) return;
		isLoading.refreshing = true;

		isLoading.loadingDockerInfo = true;
		isLoading.loadingImages = true;

		const [dockerInfoResult, settingsResult] = await Promise.allSettled([
			tryCatch(systemAPI.getDockerInfo()),
			tryCatch(settingsAPI.getSettings())
		]);

		if (dockerInfoResult.status === 'fulfilled' && !dockerInfoResult.value.error) {
			dashboardStates.dockerInfo = dockerInfoResult.value.data;
		}
		isLoading.loadingDockerInfo = false;

		if (settingsResult.status === 'fulfilled' && !settingsResult.value.error) {
			dashboardStates.settings = settingsResult.value.data;
		}

		await fetchLiveSystemStats();
		isLoading.refreshing = false;
	}

	onMount(() => {
		let mounted = true;

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

	async function handleStartAll() {
		if (isLoading.starting || !dashboardStates.dockerInfo || stoppedContainers === 0) return;
		isLoading.starting = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(systemAPI.startAllStoppedContainers()),
			message: 'Failed to Start All Containers',
			setLoadingState: (value) => (isLoading.starting = value),
			onSuccess: async () => {
				toast.success('All Containers Started Successfully.');
				await refreshData();
			}
		});
	}

	async function handleStopAll() {
		if (isLoading.stopping || !dashboardStates.dockerInfo || dockerInfo?.containersRunning === 0) return;
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
							await refreshData();
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
			dangling: dashboardStates.settings?.dockerPruneMode === 'dangling'
		};

		handleApiResultWithCallbacks({
			result: await tryCatch(systemAPI.pruneAll(pruneOptions)),
			message: `Failed to Prune ${selectedTypes.join(', ')}`,
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async () => {
				dashboardStates.isPruneDialogOpen = false;
				const formattedTypes = selectedTypes.map((type) => capitalizeFirstLetter(type)).join(', ');
				toast.success(`${formattedTypes} ${selectedTypes.length > 1 ? 'were' : 'was'} pruned successfully.`);
				await refreshData();
			}
		});
	}
</script>

<div class="space-y-8">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground max-w-2xl text-sm">Overview of your Container Environment</p>
		</div>
		<ArcaneButton
			action="restart"
			onclick={refreshData}
			disabled={isLoading.refreshing || isLoading.starting || isLoading.stopping || isLoading.pruning}
		>
			{#if isLoading.refreshing}
				<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
			{:else}
				<RefreshCwIcon class="mr-2 size-4" />
			{/if}
			Refresh
		</ArcaneButton>
	</div>

	<section>
		<h2 class="mb-3 text-lg font-semibold tracking-tight">Quick Actions</h2>
		{#if isLoading.loadingDockerInfo}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{#each Array(3) as _}
					<div class="bg-card flex items-center rounded-lg border p-3">
						<div class="bg-muted mr-3 size-6 animate-pulse rounded-full"></div>
						<div class="flex-1">
							<div class="bg-muted mb-1 h-3 w-16 animate-pulse rounded"></div>
							<div class="bg-muted h-2 w-12 animate-pulse rounded"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<button
					class="bg-card ring-offset-background focus-visible:ring-ring group flex items-center rounded-lg border p-3 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!dashboardStates.dockerInfo ||
						stoppedContainers === 0 ||
						isLoading.starting ||
						isLoading.stopping ||
						isLoading.pruning}
					onclick={handleStartAll}
				>
					<div
						class="mr-3 flex size-6 items-center justify-center rounded-full bg-green-500/10 transition-colors group-hover:bg-green-500/20"
					>
						{#if isLoading.starting}
							<LoaderCircleIcon class="size-3 animate-spin text-green-500" />
						{:else}
							<CirclePlayIcon class="size-3 text-green-500" />
						{/if}
					</div>
					<div class="flex-1 text-left">
						<div class="text-sm font-medium">Start All Stopped</div>
						<div class="text-muted-foreground text-xs">{stoppedContainers} containers</div>
					</div>
				</button>

				<button
					class="bg-card ring-offset-background focus-visible:ring-ring group flex items-center rounded-lg border p-3 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!dashboardStates.dockerInfo ||
						dockerInfo?.containersRunning === 0 ||
						isLoading.starting ||
						isLoading.stopping ||
						isLoading.pruning}
					onclick={handleStopAll}
				>
					<div
						class="mr-3 flex size-6 items-center justify-center rounded-full bg-blue-500/10 transition-colors group-hover:bg-blue-500/20"
					>
						{#if isLoading.stopping}
							<LoaderCircleIcon class="size-3 animate-spin text-blue-500" />
						{:else}
							<CircleStopIcon class="size-3 text-blue-500" />
						{/if}
					</div>
					<div class="flex-1 text-left">
						<div class="text-sm font-medium">Stop All Running</div>
						<div class="text-muted-foreground text-xs">{containers.pagination.totalItems} containers</div>
					</div>
				</button>

				<button
					class="bg-card hover:border-destructive/50 disabled:hover:border-border ring-offset-background focus-visible:ring-ring group flex items-center rounded-lg border p-3 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!dashboardStates.dockerInfo || isLoading.starting || isLoading.stopping || isLoading.pruning}
					onclick={() => (dashboardStates.isPruneDialogOpen = true)}
				>
					<div
						class="mr-3 flex size-6 items-center justify-center rounded-full bg-red-500/10 transition-colors group-hover:bg-red-500/20"
					>
						{#if isLoading.pruning}
							<LoaderCircleIcon class="size-3 animate-spin text-red-500" />
						{:else}
							<Trash2Icon class="size-3 text-red-500" />
						{/if}
					</div>
					<div class="flex-1 text-left">
						<div class="text-sm font-medium">Prune System</div>
						<div class="text-muted-foreground text-xs">Clean unused resources</div>
					</div>
				</button>
			</div>
		{/if}
	</section>

	<section>
		<DropdownCard
			id="system-overview"
			title="System Overview"
			description="Hardware and Docker engine information"
			icon={MonitorIcon}
			defaultExpanded={true}
		>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<MeterMetric
					title="Running Containers"
					icon={ContainerIcon}
					description="Active containers"
					currentValue={isLoading.loadingStats ? undefined : dockerInfo?.containersRunning}
					formatValue={(v) => v.toString()}
					maxValue={Math.max(totalContainers, 1)}
					footerText={`${dockerInfo?.containersRunning} of ${totalContainers} running`}
					unit="containers"
					loading={isLoading.loadingStats}
				/>

				<MeterMetric
					title="CPU Usage"
					icon={CpuIcon}
					description="Processor utilization"
					currentValue={isLoading.loadingStats || !hasInitialStatsLoaded ? undefined : currentStats?.cpuUsage}
					unit="%"
					maxValue={100}
					loading={isLoading.loadingStats || !hasInitialStatsLoaded}
				/>

				<MeterMetric
					title="Memory Usage"
					icon={MemoryStickIcon}
					description="RAM utilization"
					currentValue={isLoading.loadingStats || !hasInitialStatsLoaded
						? undefined
						: currentStats?.memoryUsage !== undefined && currentStats?.memoryTotal !== undefined
							? (currentStats.memoryUsage / currentStats.memoryTotal) * 100
							: undefined}
					unit="%"
					formatValue={(v) => `${v.toFixed(1)}`}
					maxValue={100}
					loading={isLoading.loadingStats || !hasInitialStatsLoaded}
				/>

				<MeterMetric
					icon={HardDriveIcon}
					title="Disk Usage"
					description="Storage utilization"
					currentValue={isLoading.loadingStats || !hasInitialStatsLoaded
						? undefined
						: currentStats?.diskUsage !== undefined && currentStats?.diskTotal !== undefined
							? (currentStats.diskUsage / currentStats.diskTotal) * 100
							: undefined}
					unit="%"
					formatValue={(v) => `${v.toFixed(1)}`}
					maxValue={100}
					loading={isLoading.loadingStats || !hasInitialStatsLoaded}
				/>
			</div>

			<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card.Root>
					<Card.Content class="p-4">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-blue-500/10 p-2">
								{#if isLoading.loadingDockerInfo}
									<LoaderCircleIcon class="size-5 animate-spin text-blue-500" />
								{:else}
									<DockerIcon class="size-5 text-blue-500" />
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								{#if isLoading.loadingDockerInfo}
									<div class="space-y-2">
										<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
										<div class="bg-muted h-3 w-32 animate-pulse rounded"></div>
									</div>
								{:else}
									<p class="text-sm font-medium">Docker Engine</p>
									<p class="text-muted-foreground text-xs">
										{dashboardStates.dockerInfo?.version || 'Unknown'} •
										{dashboardStates.dockerInfo?.os || 'Unknown'}
									</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="rounded-lg border shadow-sm">
					<Card.Content class="p-4">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-green-500/10 p-2">
								{#if isLoading.loadingStats}
									<LoaderCircleIcon class="size-5 animate-spin text-green-500" />
								{:else}
									<BoxIcon class="size-5 text-green-500" />
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								{#if isLoading.loadingStats}
									<div class="space-y-2">
										<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
										<div class="bg-muted h-3 w-32 animate-pulse rounded"></div>
									</div>
								{:else}
									<p class="text-sm font-medium">Total Containers</p>
									<p class="text-muted-foreground text-xs">
										{totalContainers} total • {stoppedContainers} stopped
									</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="rounded-lg border shadow-sm">
					<Card.Content class="p-4">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-purple-500/10 p-2">
								{#if isLoading.loadingImages}
									<LoaderCircleIcon class="size-5 animate-spin text-purple-500" />
								{:else}
									<HardDriveIcon class="size-5 text-purple-500" />
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								{#if isLoading.loadingImages}
									<div class="space-y-2">
										<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
										<div class="bg-muted h-3 w-28 animate-pulse rounded"></div>
									</div>
								{:else}
									<p class="text-sm font-medium">Docker Images</p>
									<p class="text-muted-foreground text-xs">
										{images.pagination.totalItems} images
									</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</DropdownCard>
	</section>

	<section>
		<h2 class="mb-4 text-lg font-semibold tracking-tight">Resources</h2>
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<DashboardContainerTable bind:containers isLoading={isLoading.loadingStats} />
			<DashboardImageTable bind:images isLoading={isLoading.loadingImages} />
		</div>
	</section>

	<PruneConfirmationDialog
		bind:open={dashboardStates.isPruneDialogOpen}
		isPruning={isLoading.pruning}
		imagePruneMode={(dashboardStates.settings?.dockerPruneMode as 'dangling' | 'all') || 'dangling'}
		onConfirm={confirmPrune}
		onCancel={() => (dashboardStates.isPruneDialogOpen = false)}
	/>
</div>
