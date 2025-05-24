<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, RefreshCw, HardDrive, Clock, Network, Terminal, Cpu, MemoryStick } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import { formatDate, formatLogLine } from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import type Docker from 'dockerode';
	import type { ContainerInspectInfo } from 'dockerode';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { onDestroy } from 'svelte';

	// Define the network config interface to match what Docker actually returns
	interface NetworkConfig {
		IPAddress?: string;
		IPPrefixLen?: number;
		Gateway?: string;
		MacAddress?: string;
		Aliases?: string[];
		Links?: string[];
		[key: string]: any;
	}

	// Type assertion helper for network settings
	function ensureNetworkConfig(config: any): NetworkConfig {
		return config as NetworkConfig;
	}

	let { data }: { data: PageData } = $props();
	let { container, logs: initialLogsFromServer, stats } = $derived(data);

	let displayedLogs = $derived(initialLogsFromServer || '');

	let starting = $state(false);
	let stopping = $state(false);
	let restarting = $state(false);
	let removing = $state(false);
	let isRefreshing = $state(false);

	let formattedLogHtml = $derived(
		displayedLogs
			? displayedLogs
					.split('\n')
					.map((line) => {
						const cleanedLine = line.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, '');
						return formatLogLine(cleanedLine);
					})
					.join('\n')
			: ''
	);
	let logsContainer = $state<HTMLDivElement | undefined>(undefined);
	let activeTab = $state('overview');
	let autoScrollLogs = $state(true);

	let logEventSource: EventSource | null = $state(null);
	let statsEventSource: EventSource | null = $state(null);

	function scrollLogsToBottom() {
		if (logsContainer) {
			logsContainer.scrollTop = logsContainer.scrollHeight;
		}
	}

	$effect(() => {
		if (logsContainer && displayedLogs && activeTab === 'logs' && autoScrollLogs) {
			scrollLogsToBottom();
		}
	});

	$effect(() => {
		if (activeTab === 'logs') {
			startLogStream();
			setTimeout(scrollLogsToBottom, 100);
		} else if (logEventSource) {
			closeLogStream();
		}
	});

	function startLogStream() {
		if (logEventSource || !container?.Id) return;

		try {
			const url = `/api/containers/${container.Id}/logs/stream`;
			const eventSource = new EventSource(url);
			logEventSource = eventSource;

			eventSource.onmessage = (event) => {
				if (event.data) {
					displayedLogs = (displayedLogs || '') + event.data;

					if (autoScrollLogs) {
						scrollLogsToBottom();
					}
				}
			};

			eventSource.onerror = (error) => {
				console.error('EventSource error:', error);
				eventSource.close();
				logEventSource = null;
			};
		} catch (error) {
			console.error('Failed to connect to log stream:', error);
		}
	}

	function closeLogStream() {
		if (logEventSource) {
			logEventSource.close();
			logEventSource = null;
		}
	}

	function startStatsStream() {
		if (statsEventSource || !container?.Id || !container.State?.Running) return;

		try {
			const url = `/api/containers/${container.Id}/stats/stream`;
			const eventSource = new EventSource(url);
			statsEventSource = eventSource;

			eventSource.onmessage = (event) => {
				if (!event.data) return;

				try {
					const statsData = JSON.parse(event.data);

					if (statsData.removed) {
						invalidateAll();
						return;
					}

					stats = statsData;
				} catch (err) {
					console.error('Error parsing stats data:', err);
				}
			};

			eventSource.onerror = (err) => {
				console.error('Stats EventSource error:', err);
				eventSource.close();
				statsEventSource = null;
			};
		} catch (error) {
			console.error('Failed to connect to stats stream:', error);
		}
	}

	function closeStatsStream() {
		if (statsEventSource) {
			statsEventSource.close();
			statsEventSource = null;
		}
	}

	$effect(() => {
		if (activeTab === 'stats' && container?.State?.Running) {
			startStatsStream();
		} else if (statsEventSource) {
			closeStatsStream();
		}
	});

	onDestroy(() => {
		closeLogStream();
		closeStatsStream();
	});

	const calculateCPUPercent = (statsData: Docker.ContainerStats | null): number => {
		if (!statsData || !statsData.cpu_stats || !statsData.precpu_stats) {
			return 0;
		}

		const cpuDelta = statsData.cpu_stats.cpu_usage.total_usage - (statsData.precpu_stats.cpu_usage?.total_usage || 0);
		const systemDelta = statsData.cpu_stats.system_cpu_usage - (statsData.precpu_stats.system_cpu_usage || 0);
		const numberCPUs = statsData.cpu_stats.online_cpus || statsData.cpu_stats.cpu_usage?.percpu_usage?.length || 1;

		if (systemDelta > 0 && cpuDelta > 0) {
			const cpuPercent = (cpuDelta / systemDelta) * numberCPUs * 100.0;
			return Math.min(Math.max(cpuPercent, 0), 100 * numberCPUs);
		}
		return 0;
	};

	const cpuUsagePercent = $derived(calculateCPUPercent(stats));
	const memoryUsageBytes = $derived(stats?.memory_stats?.usage || 0);
	const memoryLimitBytes = $derived(stats?.memory_stats?.limit || 0);
	const memoryUsageFormatted = $derived(formatBytes(memoryUsageBytes));
	const memoryLimitFormatted = $derived(formatBytes(memoryLimitBytes));
	const memoryUsagePercent = $derived(memoryLimitBytes > 0 ? (memoryUsageBytes / memoryLimitBytes) * 100 : 0);

	const getPrimaryIpAddress = (networkSettings: ContainerInspectInfo['NetworkSettings'] | undefined | null): string => {
		if (!networkSettings) return 'N/A';

		if (networkSettings.IPAddress) {
			return networkSettings.IPAddress;
		}

		if (networkSettings.Networks) {
			for (const networkName in networkSettings.Networks) {
				const network = networkSettings.Networks[networkName];
				if (network?.IPAddress) {
					return network.IPAddress;
				}
			}
		}

		return 'N/A';
	};

	const primaryIpAddress = $derived(getPrimaryIpAddress(container?.NetworkSettings));

	$effect(() => {
		if (logsContainer && displayedLogs && autoScrollLogs) {
			const atBottom = logsContainer.scrollHeight - logsContainer.scrollTop <= logsContainer.clientHeight + 50;
			if (atBottom) {
				scrollLogsToBottom();
			}
		}

		starting = false;
		stopping = false;
		restarting = false;
		removing = false;
	});

	async function refreshData() {
		isRefreshing = true;
		await invalidateAll();
		setTimeout(() => {
			isRefreshing = false;
		}, 500);
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header Section -->
	<div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
		<div class="container mx-auto px-4 py-4">
			<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
				<div class="space-y-2">
					<Breadcrumb.Root>
						<Breadcrumb.List>
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/" class="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/containers" class="text-muted-foreground hover:text-foreground transition-colors">Containers</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page class="font-medium">{container?.Name || 'Loading...'}</Breadcrumb.Page>
							</Breadcrumb.Item>
						</Breadcrumb.List>
					</Breadcrumb.Root>

					<div class="flex items-center gap-3">
						<h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
							{container?.Name || 'Container Details'}
						</h1>
						{#if container?.State}
							<StatusBadge variant={container.State.Status === 'running' ? 'green' : container.State.Status === 'exited' ? 'red' : 'amber'} text={container.State.Status} class="text-xs" />
						{/if}
					</div>
				</div>

				{#if container}
					<div class="flex gap-2 flex-wrap">
						<ActionButtons
							id={container.Id}
							type="container"
							itemState={container.State?.Running ? 'running' : 'stopped'}
							loading={{
								start: starting,
								stop: stopping,
								restart: restarting,
								remove: removing
							}}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="container mx-auto px-4 py-6">
		{#if container}
			<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="space-y-6">
				<!-- Modern Tab Navigation -->
				<div class="bg-muted/30 p-1 rounded-xl border shadow-sm">
					<Tabs.List class="grid grid-cols-6 bg-transparent gap-1 h-12">
						<Tabs.Trigger value="overview" class="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 rounded-lg font-medium transition-all">Overview</Tabs.Trigger>
						<Tabs.Trigger value="config" class="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 rounded-lg font-medium transition-all">Config</Tabs.Trigger>
						<Tabs.Trigger value="network" class="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 rounded-lg font-medium transition-all">Network</Tabs.Trigger>
						<Tabs.Trigger value="storage" class="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 rounded-lg font-medium transition-all">Storage</Tabs.Trigger>
						<Tabs.Trigger value="logs" class="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 rounded-lg font-medium transition-all">Logs</Tabs.Trigger>
						<Tabs.Trigger value="stats" class="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 rounded-lg font-medium transition-all">Metrics</Tabs.Trigger>
					</Tabs.List>
				</div>

				<Tabs.Content value="overview" class="space-y-6">
					<!-- Container Overview Cards -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
							<Card.Content class="p-6">
								<div class="flex items-start gap-4">
									<div class="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors shrink-0">
										<HardDrive class="text-blue-500 size-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-muted-foreground mb-1">Image</p>
										<p class="text-sm font-semibold truncate" title={container.Config?.Image || 'N/A'}>
											{container.Config?.Image || 'N/A'}
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>

						<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
							<Card.Content class="p-6">
								<div class="flex items-start gap-4">
									<div class="bg-green-500/10 p-3 rounded-xl group-hover:bg-green-500/20 transition-colors shrink-0">
										<Clock class="text-green-500 size-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-muted-foreground mb-1">Created</p>
										<p class="text-sm font-semibold truncate" title={formatDate(container.Created)}>
											{formatDate(container.Created)}
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>

						<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
							<Card.Content class="p-6">
								<div class="flex items-start gap-4">
									<div class="bg-purple-500/10 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors shrink-0">
										<Network class="text-purple-500 size-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-muted-foreground mb-1">IP Address</p>
										<p class="text-sm font-semibold truncate" title={primaryIpAddress}>
											{primaryIpAddress}
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>

						<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-amber-500">
							<Card.Content class="p-6">
								<div class="flex items-start gap-4">
									<div class="bg-amber-500/10 p-3 rounded-xl group-hover:bg-amber-500/20 transition-colors shrink-0">
										<Terminal class="text-amber-500 size-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-muted-foreground mb-1">Command</p>
										<p class="text-sm font-semibold truncate" title={container.Config?.Cmd?.join(' ') || 'N/A'}>
											{container.Config?.Cmd?.join(' ') || 'N/A'}
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					</div>

					<!-- Detailed Information -->
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header class="pb-4">
							<Card.Title class="text-lg">Container Configuration</Card.Title>
							<Card.Description>Additional container settings and status</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-6">
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<div class="space-y-4">
									<div class="bg-muted/30 rounded-lg p-4">
										<h4 class="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Container Details</h4>
										<div class="space-y-3">
											<div>
												<span class="text-xs font-medium text-muted-foreground">Container ID</span>
												<div class="font-mono text-xs mt-1 bg-muted/50 px-2 py-1 rounded break-all">{container.Id}</div>
											</div>
											{#if container.Config?.WorkingDir}
												<div>
													<span class="text-xs font-medium text-muted-foreground">Working Directory</span>
													<div class="text-sm mt-1">{container.Config.WorkingDir}</div>
												</div>
											{/if}
											{#if container.Config?.User}
												<div>
													<span class="text-xs font-medium text-muted-foreground">User</span>
													<div class="text-sm mt-1">{container.Config.User}</div>
												</div>
											{/if}
										</div>
									</div>
								</div>

								{#if container.State?.Health}
									<div class="bg-muted/30 rounded-lg p-4">
										<h4 class="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Health Status</h4>
										<div class="space-y-3">
											<StatusBadge variant={container.State.Health.Status === 'healthy' ? 'green' : container.State.Health.Status === 'unhealthy' ? 'red' : 'amber'} text={container.State.Health.Status} />
											{#if container.State.Health.Log && container.State.Health.Log.length > 0}
												<div class="text-xs text-muted-foreground">
													Last check: {new Date(container.State.Health.Log[0].Start).toLocaleString()}
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="config" class="space-y-6">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Environment Variables -->
						<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
							<Card.Header>
								<Card.Title class="text-lg flex items-center gap-2">
									<div class="bg-blue-500/10 p-2 rounded-lg">
										<Terminal class="text-blue-500 size-4" />
									</div>
									Environment Variables
								</Card.Title>
								<Card.Description>Container environment configuration</Card.Description>
							</Card.Header>
							<Card.Content class="max-h-[400px] overflow-y-auto">
								{#if container.Config?.Env && container.Config.Env.length > 0}
									<div class="space-y-2">
										{#each container.Config.Env as env, index (index)}
											<div class="bg-muted/30 rounded-lg p-3 text-sm">
												{#if env.includes('=')}
													{@const [key, ...valueParts] = env.split('=')}
													{@const value = valueParts.join('=')}
													<div class="flex flex-col gap-1">
														<span class="font-semibold text-foreground">{key}</span>
														<span class="text-muted-foreground font-mono text-xs break-all">{value}</span>
													</div>
												{:else}
													<span class="font-mono text-xs">{env}</span>
												{/if}
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center py-8 text-muted-foreground">
										<Terminal class="size-8 mx-auto mb-2 opacity-50" />
										<p class="text-sm">No environment variables set</p>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>

						<!-- Ports -->
						<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
							<Card.Header>
								<Card.Title class="text-lg flex items-center gap-2">
									<div class="bg-green-500/10 p-2 rounded-lg">
										<Network class="text-green-500 size-4" />
									</div>
									Port Mappings
								</Card.Title>
								<Card.Description>Container port configuration</Card.Description>
							</Card.Header>
							<Card.Content>
								{#if container.NetworkSettings?.Ports && Object.keys(container.NetworkSettings.Ports).length > 0}
									<div class="space-y-3">
										{#each Object.entries(container.NetworkSettings.Ports) as [containerPort, hostBindings] (containerPort)}
											<div class="bg-muted/30 rounded-lg p-4">
												<div class="flex items-center justify-between">
													<div class="font-mono text-sm font-medium">{containerPort}</div>
													<div class="text-xs text-muted-foreground">→</div>
													<div class="flex flex-wrap gap-2">
														{#if Array.isArray(hostBindings) && hostBindings.length > 0}
															{#each hostBindings as binding (binding.HostIp + ':' + binding.HostPort)}
																<Badge variant="outline" class="font-mono text-xs">
																	{binding.HostIp || '0.0.0.0'}:{binding.HostPort}
																</Badge>
															{/each}
														{:else}
															<span class="text-xs text-muted-foreground">Not published</span>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center py-8 text-muted-foreground">
										<Network class="size-8 mx-auto mb-2 opacity-50" />
										<p class="text-sm">No ports exposed</p>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					</div>

					<!-- Labels -->
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header>
							<Card.Title class="text-lg flex items-center gap-2">
								<div class="bg-purple-500/10 p-2 rounded-lg">
									<Badge class="text-purple-500 size-4" />
								</div>
								Container Labels
							</Card.Title>
							<Card.Description>Metadata and annotations</Card.Description>
						</Card.Header>
						<Card.Content class="max-h-[400px] overflow-y-auto">
							{#if container.Config.Labels && Object.keys(container.Config.Labels).length > 0}
								<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
									{#each Object.entries(container.Config.Labels) as [key, value] (key)}
										<div class="bg-muted/30 rounded-lg p-3">
											<div class="text-xs font-semibold text-muted-foreground mb-1">{key}</div>
											<div class="text-sm font-mono break-all">{value?.toString() || ''}</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-center py-8 text-muted-foreground">
									<Badge class="size-8 mx-auto mb-2 opacity-50" />
									<p class="text-sm">No labels defined</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="network" class="space-y-6">
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header>
							<Card.Title class="text-lg flex items-center gap-2">
								<div class="bg-blue-500/10 p-2 rounded-lg">
									<Network class="text-blue-500 size-4" />
								</div>
								Network Connections
							</Card.Title>
							<Card.Description>Network interfaces and configuration</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if container.NetworkSettings?.Networks && Object.keys(container.NetworkSettings.Networks).length > 0}
								<div class="grid gap-6">
									{#each Object.entries(container.NetworkSettings.Networks) as [networkName, rawNetworkConfig] (networkName)}
										{@const networkConfig = ensureNetworkConfig(rawNetworkConfig)}
										<div class="border rounded-xl overflow-hidden">
											<div class="bg-muted/50 px-4 py-3 border-b">
												<h4 class="font-semibold text-lg">{networkName}</h4>
											</div>
											<div class="p-4">
												<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div class="space-y-3">
														<div>
															<span class="text-xs font-medium text-muted-foreground">IP Address</span>
															<div class="font-mono text-sm mt-1">{networkConfig.IPAddress || 'N/A'}</div>
														</div>
														<div>
															<span class="text-xs font-medium text-muted-foreground">Gateway</span>
															<div class="font-mono text-sm mt-1">{networkConfig.Gateway || 'N/A'}</div>
														</div>
													</div>
													<div class="space-y-3">
														<div>
															<span class="text-xs font-medium text-muted-foreground">MAC Address</span>
															<div class="font-mono text-sm mt-1">{networkConfig.MacAddress || 'N/A'}</div>
														</div>
														<div>
															<span class="text-xs font-medium text-muted-foreground">Subnet</span>
															<div class="font-mono text-sm mt-1">
																{networkConfig.IPPrefixLen ? `${networkConfig.IPAddress}/${networkConfig.IPPrefixLen}` : 'N/A'}
															</div>
														</div>
													</div>
													{#if networkConfig.Aliases && networkConfig.Aliases.length > 0}
														<div class="col-span-full">
															<span class="text-xs font-medium text-muted-foreground">Aliases</span>
															<div class="flex flex-wrap gap-1 mt-1">
																{#each networkConfig.Aliases as alias}
																	<Badge variant="secondary" class="text-xs">{alias}</Badge>
																{/each}
															</div>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-center py-12 text-muted-foreground">
									<Network class="size-12 mx-auto mb-4 opacity-50" />
									<p class="text-lg font-medium mb-2">No Networks Connected</p>
									<p class="text-sm">This container is not connected to any networks</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="storage" class="space-y-6">
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header>
							<Card.Title class="text-lg flex items-center gap-2">
								<div class="bg-amber-500/10 p-2 rounded-lg">
									<HardDrive class="text-amber-500 size-4" />
								</div>
								Storage Mounts
							</Card.Title>
							<Card.Description>Container filesystem and volume mounts</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if container.Mounts && container.Mounts.length > 0}
								<div class="space-y-4">
									{#each container.Mounts as mount (mount.Destination)}
										<div class="border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
											<div class={`p-4 border-b ${mount.Type === 'volume' ? 'bg-purple-500/5' : mount.Type === 'bind' ? 'bg-blue-500/5' : 'bg-amber-500/5'}`}>
												<div class="flex items-center justify-between">
													<div class="flex items-center gap-3">
														<div class={`p-2 rounded-lg ${mount.Type === 'volume' ? 'bg-purple-500/10' : mount.Type === 'bind' ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}>
															{#if mount.Type === 'volume'}
																<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-600">
																	<path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10"></path>
																	<path d="m16 2 5 5-9 9H7v-5l9-9Z"></path>
																</svg>
															{:else if mount.Type === 'bind'}
																<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600">
																	<path d="M20 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6"></path>
																	<path d="M3 6h18"></path>
																	<path d="M15 3h-6a2 2 0 0 0-2 2v1h10V5a2 2 0 0 0-2-2Z"></path>
																</svg>
															{:else}
																<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600">
																	<path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"></path>
																	<path d="M15 3h6v6"></path>
																	<path d="M14 4 21 11"></path>
																</svg>
															{/if}
														</div>
														<div>
															<div class="font-medium">
																{mount.Type === 'tmpfs' ? 'Temporary Filesystem' : mount.Type === 'volume' ? mount.Name || 'Docker Volume' : 'Host Directory'}
															</div>
															<div class="text-xs text-muted-foreground">
																{mount.Type} mount • {mount.RW ? 'read-write' : 'read-only'}
															</div>
														</div>
													</div>
													<Badge variant={mount.RW ? 'default' : 'secondary'} class="text-xs">
														{mount.RW ? 'RW' : 'RO'}
													</Badge>
												</div>
											</div>
											<div class="p-4 space-y-3">
												<div>
													<span class="text-xs font-medium text-muted-foreground">Container Path</span>
													<div class="font-mono text-sm bg-muted/50 px-2 py-1 rounded mt-1 break-all">{mount.Destination}</div>
												</div>
												<div>
													<span class="text-xs font-medium text-muted-foreground">Source</span>
													<div class="font-mono text-sm bg-muted/50 px-2 py-1 rounded mt-1 break-all">{mount.Source}</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-center py-12 text-muted-foreground">
									<HardDrive class="size-12 mx-auto mb-4 opacity-50" />
									<p class="text-lg font-medium mb-2">No Storage Mounts</p>
									<p class="text-sm">This container runs without persistent storage</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="logs" class="space-y-6">
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header>
							<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
								<div>
									<Card.Title class="text-lg flex items-center gap-2">
										<div class="bg-green-500/10 p-2 rounded-lg">
											<Terminal class="text-green-500 size-4" />
										</div>
										Container Logs
									</Card.Title>
									<Card.Description>Real-time container output</Card.Description>
								</div>
								<div class="flex items-center gap-3">
									<label class="flex items-center gap-2 text-sm">
										<input type="checkbox" class="rounded border-border" checked={autoScrollLogs} onchange={(e) => (autoScrollLogs = e.currentTarget.checked)} />
										Auto-scroll
									</label>
									<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing} class="gap-2">
										<RefreshCw class={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
								</div>
							</div>
						</Card.Header>
						<Card.Content>
							<div
								class="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto border h-[500px] scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
								bind:this={logsContainer}
								onscroll={() => {
									if (logsContainer) {
										const atBottom = logsContainer.scrollHeight - logsContainer.scrollTop <= logsContainer.clientHeight + 50;
										if (!atBottom && autoScrollLogs) {
											autoScrollLogs = false;
										}
									}
								}}
							>
								{#if formattedLogHtml}
									<pre class="m-0 whitespace-pre-wrap break-words leading-relaxed">{@html formattedLogHtml}</pre>
								{:else}
									<div class="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
										<Terminal class="size-12 mb-4 opacity-40" />
										<p class="text-sm">No logs available</p>
										<p class="text-xs mt-1 opacity-70">The container may not have started yet or produces no output</p>
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="stats" class="space-y-6">
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header>
							<div class="flex justify-between items-center">
								<div>
									<Card.Title class="text-lg flex items-center gap-2">
										<div class="bg-purple-500/10 p-2 rounded-lg">
											<Cpu class="text-purple-500 size-4" />
										</div>
										Resource Usage
									</Card.Title>
									<Card.Description>Real-time container metrics</Card.Description>
								</div>
								<Button variant="ghost" size="icon" onclick={refreshData} disabled={isRefreshing}>
									<RefreshCw class={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
								</Button>
							</div>
						</Card.Header>
						<Card.Content>
							{#if stats && container.State?.Running}
								<div class="grid gap-6">
									<!-- CPU Usage -->
									<div class="bg-muted/30 rounded-lg p-4">
										<div class="flex justify-between items-center mb-3">
											<span class="text-sm font-medium flex items-center gap-2">
												<Cpu class="text-muted-foreground size-4" />
												CPU Usage
											</span>
											<span class="text-sm font-semibold">{cpuUsagePercent.toFixed(1)}%</span>
										</div>
										<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
											<div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" style="width: {Math.min(cpuUsagePercent, 100)}%"></div>
										</div>
									</div>

									<!-- Memory Usage -->
									<div class="bg-muted/30 rounded-lg p-4">
										<div class="flex justify-between items-center mb-3">
											<span class="text-sm font-medium flex items-center gap-2">
												<MemoryStick class="text-muted-foreground size-4" />
												Memory Usage
											</span>
											<span class="text-sm font-semibold">{memoryUsageFormatted} / {memoryLimitFormatted}</span>
										</div>
										<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
											<div class="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500" style="width: {Math.min(memoryUsagePercent, 100)}%"></div>
										</div>
									</div>

									<!-- Network I/O -->
									<div class="bg-muted/30 rounded-lg p-4">
										<h4 class="text-sm font-medium mb-3 flex items-center gap-2">
											<Network class="text-muted-foreground size-4" />
											Network I/O
										</h4>
										<div class="grid grid-cols-2 gap-4">
											<div class="text-center">
												<div class="text-xs text-muted-foreground mb-1">Received</div>
												<div class="text-lg font-semibold">{formatBytes(stats.networks?.eth0?.rx_bytes || 0)}</div>
											</div>
											<div class="text-center">
												<div class="text-xs text-muted-foreground mb-1">Transmitted</div>
												<div class="text-lg font-semibold">{formatBytes(stats.networks?.eth0?.tx_bytes || 0)}</div>
											</div>
										</div>
									</div>

									<!-- Additional Stats -->
									{#if stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0}
										<div class="bg-muted/30 rounded-lg p-4">
											<h4 class="text-sm font-medium mb-3">Block I/O</h4>
											<div class="grid grid-cols-2 gap-4">
												<div class="text-center">
													<div class="text-xs text-muted-foreground mb-1">Read</div>
													<div class="text-lg font-semibold">
														{formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === 'Read').reduce((acc, item) => acc + item.value, 0))}
													</div>
												</div>
												<div class="text-center">
													<div class="text-xs text-muted-foreground mb-1">Write</div>
													<div class="text-lg font-semibold">
														{formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === 'Write').reduce((acc, item) => acc + item.value, 0))}
													</div>
												</div>
											</div>
										</div>
									{/if}

									{#if stats.pids_stats && stats.pids_stats.current !== undefined}
										<div class="bg-muted/30 rounded-lg p-4">
											<div class="flex justify-between items-center">
												<span class="text-sm font-medium">Process Count</span>
												<span class="text-lg font-semibold">{stats.pids_stats.current}</span>
											</div>
										</div>
									{/if}
								</div>
							{:else if !container.State?.Running}
								<div class="text-center py-12 text-muted-foreground">
									<Cpu class="size-12 mx-auto mb-4 opacity-50" />
									<p class="text-lg font-medium mb-2">Container Not Running</p>
									<p class="text-sm">Metrics are only available when the container is running</p>
								</div>
							{:else}
								<div class="text-center py-12 text-muted-foreground">
									<AlertCircle class="size-12 mx-auto mb-4 opacity-50" />
									<p class="text-lg font-medium mb-2">Unable to Load Stats</p>
									<p class="text-sm">Could not retrieve container metrics</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		{:else}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="bg-muted/50 p-6 rounded-full mb-6">
					<AlertCircle class="text-muted-foreground size-12" />
				</div>
				<h2 class="text-2xl font-bold mb-2">Container Not Found</h2>
				<p class="text-muted-foreground max-w-md mb-8">Could not load container data. It may have been removed or the Docker engine is not accessible.</p>
				<div class="flex gap-3">
					<Button variant="outline" href="/containers" class="gap-2">
						<ArrowLeft class="size-4" />
						Back to Containers
					</Button>
					<Button onclick={refreshData} class="gap-2">
						<RefreshCw class="size-4" />
						Retry
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
