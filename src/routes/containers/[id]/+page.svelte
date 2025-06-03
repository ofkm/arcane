<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, RefreshCw, HardDrive, Clock, Network, Terminal, Cpu, MemoryStick, Settings, Activity, FileText, Database } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import { formatDate } from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import type Docker from 'dockerode';
	import type { ContainerInspectInfo } from 'dockerode';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { onDestroy } from 'svelte';
	import LogViewer from '$lib/components/LogViewer.svelte';
	import Meter from '$lib/components/meter.svelte';

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
	let { container, stats } = $derived(data);

	let starting = $state(false);
	let stopping = $state(false);
	let restarting = $state(false);
	let removing = $state(false);
	let isRefreshing = $state(false);

	let activeSection = $state<string>('overview');
	let autoScrollLogs = $state(true);
	let isStreaming = $state(false);

	let logViewer = $state<LogViewer>();
	let statsEventSource: EventSource | null = $state(null);

	// Helper function to clean container name
	const cleanContainerName = (name: string | undefined): string => {
		if (!name) return 'Container Details';
		// Remove leading slash and any extra slashes
		return name.replace(/^\/+/, '');
	};

	const containerDisplayName = $derived(cleanContainerName(container?.Name));

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
		if (activeSection === 'stats' && container?.State?.Running) {
			startStatsStream();
		} else if (statsEventSource) {
			closeStatsStream();
		}
	});

	onDestroy(() => {
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

	// LogViewer callback functions
	function handleLogStart() {
		isStreaming = true;
	}

	function handleLogStop() {
		isStreaming = false;
	}

	function handleLogClear() {
		// Custom logic when logs are cleared if needed
	}

	function handleToggleAutoScroll() {
		// Custom logic when auto-scroll is toggled if needed
	}

	// Navigation sections for single-page layout
	const navigationSections = [
		{ id: 'overview', label: 'Overview', icon: HardDrive },
		{ id: 'stats', label: 'Metrics', icon: Activity },
		{ id: 'logs', label: 'Logs', icon: FileText },
		{ id: 'config', label: 'Configuration', icon: Settings },
		{ id: 'network', label: 'Networks', icon: Network },
		{ id: 'storage', label: 'Storage', icon: Database }
	] as const;

	type SectionId = (typeof navigationSections)[number]['id'];

	function scrollToSection(sectionId: SectionId) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<div class="min-h-screen bg-background">
	{#if container}
		<!-- Fixed Header -->
		<div class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/containers">
							<ArrowLeft class="size-4 mr-2" />
							Back
						</Button>
						<div class="h-4 w-px bg-border"></div>
						<div class="flex items-center gap-2">
							<h1 class="text-lg font-semibold truncate max-w-[300px]" title={containerDisplayName}>
								{containerDisplayName}
							</h1>
							{#if container?.State}
								<StatusBadge variant={container.State.Status === 'running' ? 'green' : container.State.Status === 'exited' ? 'red' : 'amber'} text={container.State.Status} />
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<Button variant="ghost" size="sm" onclick={refreshData} disabled={isRefreshing}>
							<RefreshCw class={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
							Refresh
						</Button>
						{#if container}
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
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="flex h-[calc(100vh-64px)]">
			<!-- Fixed Sidebar Navigation - Narrower -->
			<div class="w-48 shrink-0 border-r bg-background/50">
				<div class="sticky top-16 p-3">
					<nav class="space-y-1">
						{#each navigationSections as section}
							{@const IconComponent = section.icon}
							<button
								onclick={() => scrollToSection(section.id)}
								class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
									{activeSection === section.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
							>
								<IconComponent class="size-4 shrink-0" />
								<span class="truncate">{section.label}</span>
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Main Content - Full width usage -->
			<div class="flex-1 overflow-y-auto">
				<div class="p-6 max-w-none">
					<div class="space-y-8">
						<!-- Overview Section -->
						<section id="overview" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<HardDrive class="size-5" />
								Overview
							</h2>

							<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
								<!-- Basic Info Card -->
								<Card.Root class="border">
									<Card.Header class="pb-4">
										<Card.Title>Container Details</Card.Title>
									</Card.Header>
									<Card.Content class="space-y-4">
										<div class="flex items-center gap-3">
											<div class="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
												<HardDrive class="size-4 text-blue-600" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="text-sm text-muted-foreground">Image</div>
												<div class="font-medium truncate" title={container.Config?.Image}>
													{container.Config?.Image || 'N/A'}
												</div>
											</div>
										</div>

										<div class="flex items-center gap-3">
											<div class="bg-green-50 dark:bg-green-950/20 p-2 rounded">
												<Clock class="size-4 text-green-600" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="text-sm text-muted-foreground">Created</div>
												<div class="font-medium" title={formatDate(container.Created)}>
													{formatDate(container.Created)}
												</div>
											</div>
										</div>

										<div class="flex items-center gap-3">
											<div class="bg-purple-50 dark:bg-purple-950/20 p-2 rounded">
												<Network class="size-4 text-purple-600" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="text-sm text-muted-foreground">IP Address</div>
												<div class="font-medium">{primaryIpAddress}</div>
											</div>
										</div>

										<div class="flex items-center gap-3">
											<div class="bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
												<Terminal class="size-4 text-amber-600" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="text-sm text-muted-foreground">Command</div>
												<div class="font-medium truncate" title={container.Config?.Cmd?.join(' ')}>
													{container.Config?.Cmd?.join(' ') || 'N/A'}
												</div>
											</div>
										</div>
									</Card.Content>
								</Card.Root>

								<!-- Quick Stats Card -->
								<Card.Root class="border">
									<Card.Header class="pb-4">
										<Card.Title>Quick Stats</Card.Title>
									</Card.Header>
									<Card.Content class="space-y-6">
										{#if stats && container.State?.Running}
											<Meter label="CPU Usage" valueLabel="{cpuUsagePercent.toFixed(1)}%" value={cpuUsagePercent} max={100} variant={cpuUsagePercent > 80 ? 'destructive' : cpuUsagePercent > 60 ? 'warning' : 'default'} />

											<Meter label="Memory Usage" valueLabel="{memoryUsageFormatted} / {memoryLimitFormatted}" value={memoryUsagePercent} max={100} variant={memoryUsagePercent > 80 ? 'destructive' : memoryUsagePercent > 60 ? 'warning' : 'default'} />
										{:else}
											<div class="text-muted-foreground text-center py-8">
												{container.State?.Running ? 'Loading stats...' : 'Container not running'}
											</div>
										{/if}
									</Card.Content>
								</Card.Root>
							</div>

							<!-- Container ID and Health -->
							<Card.Root class="border">
								<Card.Header class="pb-4">
									<Card.Title>System Information</Card.Title>
								</Card.Header>
								<Card.Content class="space-y-4">
									<div>
										<div class="text-sm text-muted-foreground mb-2">Container ID</div>
										<div class="font-mono bg-muted/50 p-3 rounded text-sm break-all">{container.Id}</div>
									</div>

									{#if container.Config?.WorkingDir}
										<div>
											<div class="text-sm text-muted-foreground mb-2">Working Directory</div>
											<div class="font-mono bg-muted/50 p-3 rounded break-all">{container.Config.WorkingDir}</div>
										</div>
									{/if}

									{#if container.Config?.User}
										<div>
											<div class="text-sm text-muted-foreground mb-2">User</div>
											<div class="font-mono bg-muted/50 p-3 rounded">{container.Config.User}</div>
										</div>
									{/if}

									{#if container.State?.Health}
										<div>
											<div class="text-sm text-muted-foreground mb-2">Health Status</div>
											<div class="flex items-center gap-3">
												<StatusBadge variant={container.State.Health.Status === 'healthy' ? 'green' : container.State.Health.Status === 'unhealthy' ? 'red' : 'amber'} text={container.State.Health.Status} />
												{#if container.State.Health.Log && container.State.Health.Log.length > 0}
													<span class="text-sm text-muted-foreground">
														Last check: {new Date(container.State.Health.Log[0].Start).toLocaleString()}
													</span>
												{/if}
											</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Stats Section -->
						<section id="stats" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<Activity class="size-5" />
								Resource Metrics
							</h2>

							<Card.Root class="border">
								<Card.Content class="p-6">
									{#if stats && container.State?.Running}
										<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
											<!-- CPU and Memory -->
											<div class="space-y-6">
												<Meter label="CPU Usage" valueLabel="{cpuUsagePercent.toFixed(2)}%" value={cpuUsagePercent} max={100} variant={cpuUsagePercent > 80 ? 'destructive' : cpuUsagePercent > 60 ? 'warning' : 'default'} size="lg" />

												<Meter label="Memory Usage" valueLabel="{memoryUsageFormatted} / {memoryLimitFormatted} ({memoryUsagePercent.toFixed(1)}%)" value={memoryUsagePercent} max={100} variant={memoryUsagePercent > 80 ? 'destructive' : memoryUsagePercent > 60 ? 'warning' : 'default'} size="lg" />
											</div>

											<!-- Network I/O -->
											<div class="space-y-6">
												<div>
													<h4 class="font-medium mb-4 flex items-center gap-2">
														<Network class="size-4" /> Network I/O
													</h4>
													<div class="grid grid-cols-2 gap-4">
														<div class="bg-muted/30 p-4 rounded">
															<div class="text-sm text-muted-foreground">Received</div>
															<div class="font-medium mt-1">{formatBytes(stats.networks?.eth0?.rx_bytes || 0)}</div>
														</div>
														<div class="bg-muted/30 p-4 rounded">
															<div class="text-sm text-muted-foreground">Transmitted</div>
															<div class="font-medium mt-1">{formatBytes(stats.networks?.eth0?.tx_bytes || 0)}</div>
														</div>
													</div>
												</div>

												{#if stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0}
													<div>
														<h4 class="font-medium mb-4">Block I/O</h4>
														<div class="grid grid-cols-2 gap-4">
															<div class="bg-muted/30 p-4 rounded">
																<div class="text-sm text-muted-foreground">Read</div>
																<div class="font-medium mt-1">
																	{formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === 'Read').reduce((acc, item) => acc + item.value, 0))}
																</div>
															</div>
															<div class="bg-muted/30 p-4 rounded">
																<div class="text-sm text-muted-foreground">Write</div>
																<div class="font-medium mt-1">
																	{formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === 'Write').reduce((acc, item) => acc + item.value, 0))}
																</div>
															</div>
														</div>
													</div>
												{/if}
											</div>
										</div>

										{#if stats.pids_stats && stats.pids_stats.current !== undefined}
											<div class="mt-6 pt-6 border-t">
												<div class="text-sm">
													<span class="text-muted-foreground">Process count:</span>
													<span class="ml-2 font-medium">{stats.pids_stats.current}</span>
												</div>
											</div>
										{/if}
									{:else if !container.State?.Running}
										<div class="text-center text-muted-foreground py-12">Container is not running. Stats unavailable.</div>
									{:else}
										<div class="text-center text-muted-foreground py-12">Loading stats...</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Logs Section -->
						<section id="logs" class="scroll-mt-20">
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-xl font-semibold flex items-center gap-2">
									<FileText class="size-5" />
									Container Logs
								</h2>
								<div class="flex items-center gap-3">
									<label class="flex items-center gap-2">
										<input type="checkbox" bind:checked={autoScrollLogs} class="size-4" />
										Auto-scroll
									</label>
									<Button variant="outline" size="sm" onclick={() => logViewer?.clearLogs()}>Clear</Button>
									{#if isStreaming}
										<div class="flex items-center gap-2">
											<div class="size-2 bg-green-500 rounded-full animate-pulse"></div>
											<span class="text-green-600 text-sm font-medium">Live</span>
										</div>
										<Button variant="outline" size="sm" onclick={() => logViewer?.stopLogStream()}>Stop</Button>
									{:else}
										<Button variant="outline" size="sm" onclick={() => logViewer?.startLogStream()} disabled={!container?.Id}>Start</Button>
									{/if}
								</div>
							</div>

							<Card.Root class="border">
								<Card.Content class="p-0">
									<LogViewer bind:this={logViewer} bind:autoScroll={autoScrollLogs} type="container" containerId={container?.Id} maxLines={500} showTimestamps={true} height="400px" onStart={handleLogStart} onStop={handleLogStop} onClear={handleLogClear} onToggleAutoScroll={handleToggleAutoScroll} />
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Configuration Section -->
						<section id="config" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<Settings class="size-5" />
								Configuration
							</h2>

							<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<!-- Environment Variables -->
								<Card.Root class="border">
									<Card.Header class="pb-4">
										<Card.Title>Environment Variables</Card.Title>
									</Card.Header>
									<Card.Content class="max-h-80 overflow-y-auto">
										{#if container.Config?.Env && container.Config.Env.length > 0}
											<div class="space-y-2">
												{#each container.Config.Env as env, index (index)}
													{#if env.includes('=')}
														{@const [key, ...valueParts] = env.split('=')}
														{@const value = valueParts.join('=')}
														<div class="flex border-b border-muted/30 py-2">
															<span class="font-medium w-1/3 pr-3 truncate" title={key}>{key}</span>
															<span class="w-2/3 truncate text-muted-foreground" title={value}>{value}</span>
														</div>
													{:else}
														<div class="border-b border-muted/30 py-2">{env}</div>
													{/if}
												{/each}
											</div>
										{:else}
											<div class="text-muted-foreground text-center py-8">No environment variables</div>
										{/if}
									</Card.Content>
								</Card.Root>

								<!-- Ports -->
								<Card.Root class="border">
									<Card.Header class="pb-4">
										<Card.Title>Port Mappings</Card.Title>
									</Card.Header>
									<Card.Content>
										{#if container.NetworkSettings?.Ports && Object.keys(container.NetworkSettings.Ports).length > 0}
											<div class="space-y-3">
												{#each Object.entries(container.NetworkSettings.Ports) as [containerPort, hostBindings] (containerPort)}
													<div class="flex items-center justify-between p-3 bg-muted/20 rounded">
														<span class="font-mono">{containerPort}</span>
														<div class="flex items-center gap-2">
															<span class="text-muted-foreground">→</span>
															{#if Array.isArray(hostBindings) && hostBindings.length > 0}
																{#each hostBindings as binding (binding.HostIp + ':' + binding.HostPort)}
																	<Badge variant="outline" class="font-mono">
																		{binding.HostIp || '0.0.0.0'}:{binding.HostPort}
																	</Badge>
																{/each}
															{:else}
																<span class="text-muted-foreground">Not published</span>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<div class="text-muted-foreground text-center py-8">No ports exposed</div>
										{/if}
									</Card.Content>
								</Card.Root>
							</div>

							<!-- Labels -->
							<Card.Root class="border mt-6">
								<Card.Header class="pb-4">
									<Card.Title>Labels</Card.Title>
								</Card.Header>
								<Card.Content class="max-h-60 overflow-y-auto">
									{#if container.Config?.Labels && Object.keys(container.Config.Labels).length > 0}
										<div class="space-y-2">
											{#each Object.entries(container.Config.Labels) as [key, value] (key)}
												<div class="flex border-b border-muted/30 py-2">
													<span class="font-medium w-1/3 pr-3 truncate" title={key}>{key}</span>
													<span class="w-2/3 truncate text-muted-foreground" title={value?.toString()}>{value?.toString() || ''}</span>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-muted-foreground text-center py-8">No labels defined</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Network Section -->
						<section id="network" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<Network class="size-5" />
								Networks
							</h2>

							<Card.Root class="border">
								<Card.Content class="p-6">
									{#if container.NetworkSettings?.Networks && Object.keys(container.NetworkSettings.Networks).length > 0}
										<div class="space-y-6">
											{#each Object.entries(container.NetworkSettings.Networks) as [networkName, rawNetworkConfig] (networkName)}
												{@const networkConfig = ensureNetworkConfig(rawNetworkConfig)}
												<div class="border rounded p-4">
													<div class="font-medium mb-4">{networkName}</div>
													<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
														<div>
															<div class="text-sm text-muted-foreground">IP Address</div>
															<div class="font-mono">{networkConfig.IPAddress || 'N/A'}</div>
														</div>
														<div>
															<div class="text-sm text-muted-foreground">Gateway</div>
															<div class="font-mono">{networkConfig.Gateway || 'N/A'}</div>
														</div>
														<div>
															<div class="text-sm text-muted-foreground">MAC Address</div>
															<div class="font-mono">{networkConfig.MacAddress || 'N/A'}</div>
														</div>
														<div>
															<div class="text-sm text-muted-foreground">Subnet</div>
															<div class="font-mono">
																{networkConfig.IPPrefixLen ? `${networkConfig.IPAddress}/${networkConfig.IPPrefixLen}` : 'N/A'}
															</div>
														</div>
														{#if networkConfig.Aliases && networkConfig.Aliases.length > 0}
															<div class="col-span-2">
																<div class="text-sm text-muted-foreground">Aliases</div>
																<div class="font-mono">{networkConfig.Aliases.join(', ')}</div>
															</div>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-muted-foreground text-center py-12">No networks connected</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Storage Section -->
						<section id="storage" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<Database class="size-5" />
								Storage & Mounts
							</h2>

							<Card.Root class="border">
								<Card.Content class="p-6">
									{#if container.Mounts && container.Mounts.length > 0}
										<div class="space-y-4">
											{#each container.Mounts as mount (mount.Destination)}
												<div class="border rounded overflow-hidden">
													<div class="flex items-center justify-between p-4 bg-muted/20">
														<div class="flex items-center gap-3">
															<div class="p-2 rounded {mount.Type === 'volume' ? 'bg-purple-100 dark:bg-purple-950' : mount.Type === 'bind' ? 'bg-blue-100 dark:bg-blue-950' : 'bg-amber-100 dark:bg-amber-950'}">
																{#if mount.Type === 'volume'}
																	<Database class="size-4 text-purple-600" />
																{:else if mount.Type === 'bind'}
																	<HardDrive class="size-4 text-blue-600" />
																{:else}
																	<Terminal class="size-4 text-amber-600" />
																{/if}
															</div>
															<div>
																<div class="font-medium">
																	{mount.Type === 'tmpfs' ? 'Temporary filesystem' : mount.Type === 'volume' ? mount.Name || 'Docker volume' : 'Host directory'}
																</div>
																<div class="text-sm text-muted-foreground">
																	{mount.Type} mount {mount.RW ? '(read-write)' : '(read-only)'}
																</div>
															</div>
														</div>
														<Badge variant={mount.RW ? 'outline' : 'secondary'}>
															{mount.RW ? 'RW' : 'RO'}
														</Badge>
													</div>
													<div class="p-4 space-y-3">
														<div class="flex">
															<span class="w-24 text-muted-foreground font-medium">Container:</span>
															<span class="font-mono bg-muted/50 px-2 py-1 rounded flex-1">{mount.Destination}</span>
														</div>
														<div class="flex">
															<span class="w-24 text-muted-foreground font-medium">
																{mount.Type === 'volume' ? 'Volume:' : mount.Type === 'bind' ? 'Host:' : 'Source:'}
															</span>
															<span class="font-mono bg-muted/50 px-2 py-1 rounded flex-1">{mount.Source}</span>
														</div>
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-center py-12">
											<div class="mb-4 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-16">
												<Database class="size-6 text-muted-foreground" />
											</div>
											<div class="text-muted-foreground">No volumes or mounts configured</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="min-h-screen flex items-center justify-center">
			<div class="text-center">
				<div class="rounded-full bg-muted/50 p-6 mb-6 inline-flex">
					<AlertCircle class="text-muted-foreground size-10" />
				</div>
				<h2 class="text-2xl font-medium mb-3">Container Not Found</h2>
				<p class="text-center text-muted-foreground max-w-md mb-8">Could not load container data. It may have been removed or the Docker engine is not accessible.</p>
				<div class="flex gap-4 justify-center">
					<Button variant="outline" href="/containers">
						<ArrowLeft class="mr-2 size-4" />
						Back to Containers
					</Button>
					<Button variant="default" onclick={refreshData}>
						<RefreshCw class="mr-2 size-4" />
						Retry
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
