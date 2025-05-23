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

<div class="space-y-6 pb-8">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/containers">Containers</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{container?.Name || 'Loading...'}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<div class="mt-2 flex items-center gap-2">
				<h1 class="text-2xl font-bold tracking-tight">
					{container?.Name || 'Container Details'}
				</h1>

				{#if container?.State}
					<span class="self-start mt-1.5"><StatusBadge variant={container.State.Status === 'running' ? 'green' : container.State.Status === 'exited' ? 'red' : 'amber'} text={container.State.Status} /></span>
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

	{#if container}
		<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="space-y-4">
			<Tabs.List class="dark:bg-slate-900 grid grid-cols-6 md:w-full md:max-w-3xl mb-4">
				<Tabs.Trigger class="data-[state=active]:border data-[state=active]:border-primary/60" value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger class="data-[state=active]:border data-[state=active]:border-primary/60" value="config">Configuration</Tabs.Trigger>
				<Tabs.Trigger class="data-[state=active]:border data-[state=active]:border-primary/60" value="network">Networks</Tabs.Trigger>
				<Tabs.Trigger class="data-[state=active]:border data-[state=active]:border-primary/60" value="storage">Storage</Tabs.Trigger>
				<Tabs.Trigger class="data-[state=active]:border data-[state=active]:border-primary/60" value="logs">Logs</Tabs.Trigger>
				<Tabs.Trigger class="data-[state=active]:border data-[state=active]:border-primary/60" value="stats">Metrics</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="overview" class="space-y-6">
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Container Details</Card.Title>
						<Card.Description>Basic information about the container</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div class="flex items-start gap-3">
								<div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
									<HardDrive class="text-blue-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground">Image</p>
									<p class="text-base font-semibold mt-1 break-all">
										<span class="truncate block" title={container.Config?.Image || 'N/A'}>
											{container.Config?.Image || 'N/A'}
										</span>
									</p>
								</div>
							</div>

							<div class="flex items-start gap-3">
								<div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
									<Clock class="text-green-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground">Created</p>
									<p class="text-base font-semibold mt-1 truncate" title={formatDate(container.Created)}>
										{formatDate(container.Created)}
									</p>
								</div>
							</div>

							<div class="flex items-start gap-3">
								<div class="bg-purple-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
									<Network class="text-purple-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground">IP Address</p>
									<p class="text-base font-semibold mt-1 truncate" title={primaryIpAddress}>
										{primaryIpAddress}
									</p>
								</div>
							</div>

							<div class="flex items-start gap-3">
								<div class="bg-amber-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
									<Terminal class="text-amber-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground">Command</p>
									<p class="text-base font-semibold mt-1 truncate" title={container.Config?.Cmd?.join(' ') || 'N/A'}>
										{container.Config?.Cmd?.join(' ') || 'N/A'}
									</p>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Container Configuration</Card.Title>
						<Card.Description>Additional container settings</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-semibold">Container ID:</span>
								<div class="font-mono mt-1 text-xs break-all">{container.Id}</div>
							</div>

							{#if container.Config?.WorkingDir}
								<div>
									<span class="font-semibold">Working Directory:</span>
									<div class="mt-1 break-all">{container.Config.WorkingDir}</div>
								</div>
							{/if}

							{#if container.Config?.User}
								<div>
									<span class="font-semibold">User:</span>
									<div class="mt-1">{container.Config.User}</div>
								</div>
							{/if}

							{#if container.State?.Health}
								<div class="col-span-full">
									<span class="font-semibold">Health Status:</span>
									<div class="mt-1 flex gap-2 items-center">
										<StatusBadge variant={container.State.Health.Status === 'healthy' ? 'green' : container.State.Health.Status === 'unhealthy' ? 'red' : 'amber'} text={container.State.Health.Status} />
										{#if container.State.Health.Log && container.State.Health.Log.length > 0}
											<span class="text-xs text-muted-foreground">
												Last check: {new Date(container.State.Health.Log[0].Start).toLocaleString()}
											</span>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="config" class="space-y-6">
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Environment Variables</Card.Title>
						<Card.Description>Container environment configuration</Card.Description>
					</Card.Header>
					<Card.Content class="max-h-[360px] overflow-y-auto">
						{#if container.Config?.Env && container.Config.Env.length > 0}
							<div class="space-y-2">
								{#each container.Config.Env as env, index (index)}
									<div class="text-xs flex overflow-hidden">
										{#if env.includes('=')}
											{@const [key, ...valueParts] = env.split('=')}
											{@const value = valueParts.join('=')}
											<div class="flex w-full">
												<span class="font-semibold mr-2 min-w-[120px] max-w-[180px] truncate shrink-0" title={key}>{key}:</span>
												<span class="truncate flex-1" title={value}>{value}</span>
											</div>
										{:else}
											<span>{env}</span>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground italic">No environment variables set</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Ports</Card.Title>
						<Card.Description>Container port mappings</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if container.NetworkSettings?.Ports && Object.keys(container.NetworkSettings.Ports).length > 0}
							<div class="space-y-2">
								{#each Object.entries(container.NetworkSettings.Ports) as [containerPort, hostBindings] (containerPort)}
									<div class="flex flex-col sm:flex-row sm:items-center justify-between rounded-md bg-muted/40 p-2 px-3 gap-1">
										<div class="font-mono text-sm truncate" title={containerPort}>
											{containerPort}
										</div>
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-xs text-muted-foreground">→</span>
											{#if Array.isArray(hostBindings) && hostBindings.length > 0}
												{#each hostBindings as binding (binding.HostIp + ':' + binding.HostPort)}
													<Badge variant="outline" class="font-mono truncate max-w-[150px]" title="{binding.HostIp || '0.0.0.0'}:{binding.HostPort}">
														{binding.HostIp || '0.0.0.0'}:{binding.HostPort}
													</Badge>
												{/each}
											{:else}
												<span class="text-xs text-muted-foreground">Not published</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground italic">No ports exposed</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Labels</Card.Title>
						<Card.Description>Container metadata labels</Card.Description>
					</Card.Header>
					<Card.Content class="max-h-[360px] overflow-y-auto">
						{#if container.Config.Labels && Object.keys(container.Config.Labels).length > 0}
							<div class="space-y-2">
								{#each Object.entries(container.Config.Labels) as [key, value] (key)}
									<div class="text-xs flex overflow-hidden">
										<div class="flex w-full">
											<span class="font-semibold mr-2 min-w-[120px] max-w-[180px] truncate shrink-0" title={key}>{key}:</span>
											<span class="truncate flex-1" title={value?.toString()}>{value?.toString() || ''}</span>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground italic">No labels defined</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="network" class="space-y-6">
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Connected Networks</Card.Title>
						<Card.Description>Network settings and connections</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if container.NetworkSettings?.Networks && Object.keys(container.NetworkSettings.Networks).length > 0}
							<div class="space-y-4">
								{#each Object.entries(container.NetworkSettings.Networks) as [networkName, rawNetworkConfig] (networkName)}
									{@const networkConfig = ensureNetworkConfig(rawNetworkConfig)}
									<div class="rounded-md bg-muted/40 p-3">
										<div class="text-sm font-medium">{networkName}</div>
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
											<div class="text-xs">
												<span class="font-semibold">IP Address:</span>
												{networkConfig.IPAddress || 'N/A'}
											</div>
											<div class="text-xs">
												<span class="font-semibold">Gateway:</span>
												{networkConfig.Gateway || 'N/A'}
											</div>
											<div class="text-xs">
												<span class="font-semibold">MAC Address:</span>
												{networkConfig.MacAddress || 'N/A'}
											</div>
											<div class="text-xs">
												<span class="font-semibold">Subnet:</span>
												{networkConfig.IPPrefixLen ? `${networkConfig.IPAddress}/${networkConfig.IPPrefixLen}` : 'N/A'}
											</div>
											{#if networkConfig.Aliases && networkConfig.Aliases.length > 0}
												<div class="text-xs col-span-full">
													<span class="font-semibold">Aliases:</span>
													{networkConfig.Aliases.join(', ')}
												</div>
											{/if}
											{#if networkConfig.Links && networkConfig.Links.length > 0}
												<div class="text-xs col-span-full">
													<span class="font-semibold">Links:</span>
													{networkConfig.Links.join(', ')}
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground italic">No networks connected</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="storage" class="space-y-6">
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Volumes & Mounts</Card.Title>
						<Card.Description>Container filesystem mounts</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if container.Mounts && container.Mounts.length > 0}
							<div class="space-y-4">
								{#each container.Mounts as mount (mount.Destination)}
									<div class="rounded-md overflow-hidden border border-muted">
										<div
											class={`p-3 flex items-center justify-between gap-2 
											${mount.Type === 'volume' ? 'bg-purple-500/5 border-b border-purple-200/30' : mount.Type === 'bind' ? 'bg-blue-500/5 border-b border-blue-200/30' : 'bg-amber-500/5 border-b border-amber-200/30'}`}
										>
											<div class="flex items-center gap-2">
												<div
													class={`p-1.5 rounded-md 
														${mount.Type === 'volume' ? 'bg-purple-500/10' : mount.Type === 'bind' ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}
												>
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
													<div class="text-sm font-medium">
														{mount.Type === 'tmpfs' ? 'Temporary filesystem' : mount.Type === 'volume' ? mount.Name || 'Docker volume' : 'Host directory'}
													</div>
													<div class="text-xs text-muted-foreground">
														{mount.Type} mount {mount.RW ? '(read-write)' : '(read-only)'}
													</div>
												</div>
											</div>

											<Badge variant={mount.RW ? 'outline' : 'secondary'}>
												{mount.RW ? 'Read/Write' : 'Read Only'}
											</Badge>
										</div>

										<div class="bg-card p-3">
											<div class="grid gap-3 text-sm">
												<div class="flex items-start gap-2">
													<div class="min-w-[80px] text-xs font-semibold pt-0.5 text-muted-foreground">CONTAINER</div>
													<div class="font-mono text-xs bg-muted/50 py-1 px-2 rounded break-all flex-1">
														{mount.Destination}
													</div>
												</div>

												<div class="flex items-start gap-2">
													<div class="min-w-[80px] text-xs font-semibold pt-0.5 text-muted-foreground">
														{mount.Type === 'volume' ? 'VOLUME' : mount.Type === 'bind' ? 'HOST' : 'SOURCE'}
													</div>
													<div class="font-mono text-xs bg-muted/50 py-1 px-2 rounded break-all flex-1">
														{mount.Source}
													</div>
												</div>

												{#if mount.Driver || mount.Mode || (mount.Propagation && mount.Propagation !== 'rprivate')}
													<div class="pt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
														{#if mount.Driver}
															<div>
																<span class="font-semibold">Driver:</span>
																{mount.Driver}
															</div>
														{/if}
														{#if mount.Mode}
															<div>
																<span class="font-semibold">Mode:</span>
																{mount.Mode}
															</div>
														{/if}
														{#if mount.Propagation && mount.Propagation !== 'rprivate'}
															<div>
																<span class="font-semibold">Propagation:</span>
																{mount.Propagation}
															</div>
														{/if}
													</div>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8 border rounded-md border-dashed">
								<div class="mb-3 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-12">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
										<path d="M21 5c0-1.1-.9-2-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2V5Z"></path>
										<path d="M2 10h20"></path>
									</svg>
								</div>
								<div class="text-sm text-muted-foreground">No volumes or mounts configured</div>
								<div class="text-xs text-muted-foreground/70 mt-1">This container runs without persistent storage</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="logs" class="space-y-6">
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
							<div>
								<Card.Title class="text-lg font-semibold">Container Logs</Card.Title>
								<Card.Description>Recent output from the container</Card.Description>
							</div>
							<div class="flex items-center gap-2">
								<div class="flex items-center">
									<input type="checkbox" id="auto-scroll" class="mr-2" checked={autoScrollLogs} onchange={(e) => (autoScrollLogs = e.currentTarget.checked)} />
									<label for="auto-scroll" class="text-xs">Auto-scroll</label>
								</div>
								<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
									<RefreshCw class={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
									Refresh Logs
								</Button>
							</div>
						</div>
					</Card.Header>

					<Card.Content>
						<div
							class="bg-muted/50 text-foreground p-4 rounded-md font-mono text-xs overflow-auto border h-[500px]"
							bind:this={logsContainer}
							id="logs-container"
							style="overflow-x: auto;"
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
								<pre class="m-0 whitespace-pre-wrap break-words">{@html formattedLogHtml}</pre>
							{:else}
								<div class="flex flex-col items-center justify-center h-full text-center">
									<Terminal class="text-muted-foreground mb-3 opacity-40 size-8" />
									<p class="text-muted-foreground italic">No logs available. The container may not have started yet or produces no output.</p>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="stats" class="space-y-6">
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<div class="flex justify-between items-center">
							<div>
								<Card.Title class="text-lg font-semibold">Resource Usage</Card.Title>
								<Card.Description>Live container metrics</Card.Description>
							</div>
							<Button variant="ghost" size="icon" onclick={refreshData} disabled={isRefreshing} title="Refresh Stats">
								<RefreshCw class={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
							</Button>
						</div>
					</Card.Header>

					<Card.Content>
						{#if stats && container.State?.Running}
							<div class="space-y-6">
								<div>
									<div class="flex justify-between items-center mb-2">
										<span class="text-sm font-medium flex items-center gap-2"><Cpu class="text-muted-foreground size-4" /> CPU Usage</span>
										<span class="text-sm font-semibold">{cpuUsagePercent.toFixed(2)}%</span>
									</div>
									<div class="w-full bg-secondary rounded-full overflow-hidden size-3">
										<div class="bg-primary rounded-full transition-all duration-300 size-3" style="width: {Math.min(cpuUsagePercent, 100)}%"></div>
									</div>
								</div>

								<div>
									<div class="flex justify-between items-center mb-2">
										<span class="text-sm font-medium flex items-center gap-2"><MemoryStick class="text-muted-foreground size-4" /> Memory Usage</span>
										<span class="text-sm font-semibold">{memoryUsageFormatted} / {memoryLimitFormatted}</span>
									</div>
									<div class="w-full bg-secondary rounded-full overflow-hidden size-3">
										<div class="bg-primary rounded-full transition-all duration-300 size-3" style="width: {memoryUsagePercent.toFixed(2)}%"></div>
									</div>
								</div>

								<div>
									<h4 class="text-sm font-medium mb-2 flex items-center gap-2">
										<Network class="text-muted-foreground size-4" /> Network I/O
									</h4>
									<div class="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-md">
										<div>
											<div class="text-xs text-muted-foreground">Received</div>
											<div class="text-sm font-medium mt-1">{formatBytes(stats.networks?.eth0?.rx_bytes || 0)}</div>
										</div>
										<div>
											<div class="text-xs text-muted-foreground">Transmitted</div>
											<div class="text-sm font-medium mt-1">{formatBytes(stats.networks?.eth0?.tx_bytes || 0)}</div>
										</div>
									</div>
								</div>

								{#if stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0}
									<div>
										<h4 class="text-sm font-medium mb-2">Block I/O</h4>
										<div class="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-md">
											<div>
												<div class="text-xs text-muted-foreground">Read</div>
												<div class="text-sm font-medium mt-1">
													{formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === 'Read').reduce((acc, item) => acc + item.value, 0))}
												</div>
											</div>
											<div>
												<div class="text-xs text-muted-foreground">Write</div>
												<div class="text-sm font-medium mt-1">
													{formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === 'Write').reduce((acc, item) => acc + item.value, 0))}
												</div>
											</div>
										</div>
									</div>
								{/if}

								{#if stats.pids_stats && stats.pids_stats.current !== undefined}
									<div class="text-sm">
										<span class="font-medium">Process count:</span>
										<span class="ml-2">{stats.pids_stats.current}</span>
									</div>
								{/if}
							</div>
						{:else if !container.State?.Running}
							<div class="text-center text-sm text-muted-foreground italic py-12">Container is not running. Stats unavailable.</div>
						{:else}
							<div class="text-center text-sm text-muted-foreground italic py-12">Could not load stats.</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		<div class="flex flex-col items-center justify-center py-12 border rounded-lg shadow-sm bg-card">
			<div class="rounded-full bg-muted/50 p-4 mb-4">
				<AlertCircle class="text-muted-foreground size-8" />
			</div>
			<h2 class="text-lg font-medium mb-2">Container Not Found</h2>
			<p class="text-center text-muted-foreground max-w-md">Could not load container data. It may have been removed or the Docker engine is not accessible.</p>
			<div class="flex gap-3 mt-6">
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
	{/if}
</div>
