<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, RefreshCw, HardDrive, Clock, Network, Terminal, Cpu, MemoryStick } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import { formatDate, formatLogLine, formatBytes } from '$lib/utils';
	import type Docker from 'dockerode';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let { container, logs, stats } = $derived(data);

	let starting = $state(false);
	let stopping = $state(false);
	let restarting = $state(false);
	let removing = $state(false);
	let isRefreshing = $state(false);

	let formattedLogs = $derived(logs ? logs.split('\n').map(formatLogLine).join('\n') : '');

	let logsContainer = $state<HTMLDivElement | undefined>(undefined);

	// --- Stats Calculation ---
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
	// --- End Stats Calculation ---

	// --- Helper to find Primary IP Address ---
	// Type is any to avoid TypeScript errors, but ideally should be replaced with a proper type definition for networkSettings.
	const getPrimaryIpAddress = (networkSettings: any | undefined | null): string => {
		if (!networkSettings) return 'N/A';

		// 1. Check top-level IPAddress (common for bridge)
		if (networkSettings.IPAddress) {
			return networkSettings.IPAddress;
		}

		// 2. Check IPs within the Networks object (common for ipvlan, macvlan, custom bridges)
		if (networkSettings.Networks) {
			for (const networkName in networkSettings.Networks) {
				const network = networkSettings.Networks[networkName];
				if (network?.IPAddress) {
					// Return the first valid IP found in the networks list
					return network.IPAddress;
				}
			}
		}

		// 3. Fallback if no IP found
		return 'N/A';
	};

	const primaryIpAddress = $derived(getPrimaryIpAddress(container?.networkSettings));
	// --- End Helper ---

	$effect(() => {
		starting = false;
		stopping = false;
		restarting = false;
		removing = false;
	});

	$effect(() => {
		if (logsContainer && logs) {
			logsContainer.scrollTop = logsContainer.scrollHeight;
		}
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
	<!-- Breadcrumb Navigation -->
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
						<Breadcrumb.Page>{container?.name || 'Loading...'}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<div class="mt-2 flex items-center gap-2">
				<h1 class="text-2xl font-bold tracking-tight">
					{container?.name || 'Container Details'}
				</h1>
				{#if container?.state}
					<Badge variant={container.state.Running ? 'default' : 'destructive'} class="capitalize">
						{container.state.Status}
					</Badge>
				{/if}
			</div>
		</div>

		{#if container}
			<div class="flex gap-2 flex-wrap">
				<!-- Use ActionButtons for container actions -->
				<form
					method="POST"
					action={container.state?.Running ? '?/stop' : '?/start'}
					use:enhance={() => {
						if (container.state?.Running) {
							stopping = true;
						} else {
							starting = true;
						}
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
				>
					<ActionButtons
						id={container.id}
						type="container"
						itemState={container.state?.Running ? 'running' : 'stopped'}
						loading={{
							start: starting,
							stop: stopping,
							restart: restarting,
							remove: removing
						}}
					/>
				</form>
			</div>
		{/if}
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Action Failed</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if container}
		<!-- Container Details Section -->
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Container Details</Card.Title>
					<Card.Description>Basic information about the container</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<!-- Image -->
						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<HardDrive class="h-5 w-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Image</p>
								<p class="text-base font-semibold mt-1 break-all">
									<span class="truncate block" title={container.config?.Image || 'N/A'}>
										{container.config?.Image || 'N/A'}
									</span>
								</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div class="bg-green-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Clock class="h-5 w-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Created</p>
								<p class="text-base font-semibold mt-1 truncate" title={formatDate(container.created)}>
									{formatDate(container.created)}
								</p>
							</div>
						</div>

						<!-- IP Address -->
						<div class="flex items-start gap-3">
							<div class="bg-purple-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Network class="h-5 w-5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">IP Address</p>
								<p class="text-base font-semibold mt-1 truncate" title={primaryIpAddress}>
									{primaryIpAddress}
								</p>
							</div>
						</div>

						<!-- Command -->
						<div class="flex items-start gap-3">
							<div class="bg-amber-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Terminal class="h-5 w-5 text-amber-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Command</p>
								<p class="text-base font-semibold mt-1 truncate" title={container.config?.Cmd?.join(' ') || 'N/A'}>
									{container.config?.Cmd?.join(' ') || 'N/A'}
								</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Advanced Details (Ports, Volumes, Env) -->
			<div class="grid grid-cols-1 gap-6">
				<!-- Ports -->
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Ports</Card.Title>
						<Card.Description>Container port mappings</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if container.networkSettings?.Ports && Object.keys(container.networkSettings.Ports).length > 0}
							<div class="space-y-2">
								{#each Object.entries(container.networkSettings.Ports) as [containerPort, hostBindings], i}
									<div class="flex flex-col sm:flex-row sm:items-center justify-between rounded-md bg-muted/40 p-2 px-3 gap-1">
										<div class="font-mono text-sm truncate" title={containerPort}>
											{containerPort}
										</div>
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-xs text-muted-foreground">→</span>
											{#if hostBindings && hostBindings.length > 0}
												{#each hostBindings as binding}
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

				<!-- Environment Variables -->
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Environment Variables</Card.Title>
						<Card.Description>Container environment configuration</Card.Description>
					</Card.Header>
					<Card.Content class="max-h-[180px] overflow-y-auto">
						{#if container.config?.Env && container.config.Env.length > 0}
							<div class="space-y-2">
								{#each container.config.Env as env}
									<div class="text-xs flex overflow-hidden">
										{#if env.includes('=')}
											{@const [key, ...valueParts] = env.split('=')}
											{@const value = valueParts.join('=')}
											<div class="flex w-full">
												<span class="font-semibold mr-2 min-w-[120px] max-w-[180px] truncate flex-shrink-0" title={key}>{key}:</span>
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

				<!-- Volumes/Mounts -->
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Volumes & Mounts</Card.Title>
						<Card.Description>Container filesystem mounts</Card.Description>
					</Card.Header>
					<Card.Content class="max-h-[180px] overflow-y-auto">
						{#if container.mounts && container.mounts.length > 0}
							<div class="space-y-2">
								{#each container.mounts as mount}
									<div class="flex flex-col rounded-md bg-muted/40 p-2">
										<div class="flex gap-2 items-center">
											<Badge variant="outline">{mount.Type}</Badge>
											<span class="text-xs">{mount.RW ? 'Read/Write' : 'Read Only'}</span>
										</div>
										<div class="text-xs mt-1">
											<div class="font-semibold">Source:</div>
											<div class="break-all">{mount.Source}</div>
										</div>
										<div class="text-xs mt-1">
											<div class="font-semibold">Destination:</div>
											<div class="break-all">{mount.Destination}</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground italic">No volumes or mounts configured</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Labels -->
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Labels</Card.Title>
						<Card.Description>Container metadata labels</Card.Description>
					</Card.Header>
					<Card.Content class="max-h-[180px] overflow-y-auto">
						{#if container.labels && Object.keys(container.labels).length > 0}
							<div class="space-y-2">
								{#each Object.entries(container.labels) as [key, value]}
									<div class="text-xs flex overflow-hidden">
										<div class="flex w-full">
											<span class="font-semibold mr-2 min-w-[120px] max-w-[180px] truncate flex-shrink-0" title={key}>{key}:</span>
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

				<!-- Networks -->
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Networks</Card.Title>
						<Card.Description>Connected container networks</Card.Description>
					</Card.Header>
					<Card.Content class="max-h-[180px] overflow-y-auto">
						{#if container.networkSettings?.Networks && Object.keys(container.networkSettings.Networks).length > 0}
							<div class="space-y-2">
								{#each Object.entries(container.networkSettings.Networks) as [networkName, networkConfig]}
									<div class="rounded-md bg-muted/40 p-2">
										<div class="text-sm font-medium">{networkName}</div>
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1">
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
											{#if networkConfig.Aliases && networkConfig.Aliases.length > 0}
												<div class="text-xs col-span-full">
													<span class="font-semibold">Aliases:</span>
													{networkConfig.Aliases.join(', ')}
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

				<!-- Advanced Container Info -->
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Container Configuration</Card.Title>
						<Card.Description>Additional container settings</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
							<!-- Container ID -->
							<div>
								<span class="font-semibold">Container ID:</span>
								<div class="font-mono mt-1 text-xs break-all">{container.id}</div>
							</div>

							<!-- Working Directory -->
							{#if container.config?.WorkingDir}
								<div>
									<span class="font-semibold">Working Directory:</span>
									<div class="mt-1 break-all">{container.config.WorkingDir}</div>
								</div>
							{/if}

							<!-- User -->
							{#if container.config?.User}
								<div>
									<span class="font-semibold">User:</span>
									<div class="mt-1">{container.config.User}</div>
								</div>
							{/if}

							<!-- Health Check section -->
							{#if container.state?.Health}
								<div class="col-span-full">
									<span class="font-semibold">Health Status:</span>
									<div class="mt-1 flex gap-2 items-center">
										<StatusBadge variant={container.state.Health.Status === 'healthy' ? 'green' : container.state.Health.Status === 'unhealthy' ? 'red' : 'amber'} text={container.state.Health.Status} />
										{#if container.state.Health.Log && container.state.Health.Log.length > 0}
											<span class="text-xs text-muted-foreground">
												Last check: {new Date(container.state.Health.Log[0].Start).toLocaleString()}
											</span>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<Separator class="my-6" />

		<!-- Logs and Stats Section -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
			<!-- Logs Card -->
			<Card.Root class="lg:col-span-8 border shadow-sm">
				<Card.Header>
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
						<div>
							<Card.Title class="text-lg font-semibold">Container Logs</Card.Title>
							<Card.Description>Recent output from the container</Card.Description>
						</div>
						<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
							<RefreshCw class={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
							Refresh Logs
						</Button>
					</div>
				</Card.Header>

				<Card.Content>
					<div class="bg-muted/50 text-foreground p-4 rounded-md font-mono text-xs h-80 overflow-auto whitespace-pre-wrap border" bind:this={logsContainer} id="logs-container" style="word-break: break-all;">
						{#if logs}
							{@html formattedLogs}
						{:else}
							<div class="flex flex-col items-center justify-center h-full text-center">
								<Terminal class="h-8 w-8 text-muted-foreground mb-3 opacity-40" />
								<p class="text-muted-foreground italic">No logs available. The container may not have started yet.</p>
							</div>
						{/if}
					</div>
				</Card.Content>

				<Card.Footer class="flex justify-end border-t pt-4">
					<Button variant="outline" size="sm" href="/containers/{container.id}/logs" class="text-sm">View full logs</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Stats Card -->
			<Card.Root class="lg:col-span-4 border shadow-sm">
				<Card.Header>
					<div class="flex justify-between items-center">
						<div>
							<Card.Title class="text-lg font-semibold">Resource Usage</Card.Title>
							<Card.Description>Live container metrics</Card.Description>
						</div>
						<Button variant="ghost" size="icon" onclick={refreshData} disabled={isRefreshing} title="Refresh Stats & Logs">
							<RefreshCw class={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
						</Button>
					</div>
				</Card.Header>

				<Card.Content>
					{#if stats && container.state?.Running}
						<div class="space-y-4">
							<!-- CPU Usage -->
							<div>
								<div class="flex justify-between items-center mb-1">
									<span class="text-sm font-medium flex items-center gap-2"><Cpu class="h-4 w-4 text-muted-foreground" /> CPU Usage</span>
									<span class="text-sm font-semibold">{cpuUsagePercent.toFixed(2)}%</span>
								</div>
								<div class="w-full bg-secondary rounded-full h-2 overflow-hidden">
									<div class="bg-primary h-2 rounded-full transition-all duration-300" style="width: {Math.min(cpuUsagePercent, 100)}%"></div>
								</div>
							</div>

							<!-- Memory Usage -->
							<div>
								<div class="flex justify-between items-center mb-1">
									<span class="text-sm font-medium flex items-center gap-2"><MemoryStick class="h-4 w-4 text-muted-foreground" /> Memory Usage</span>
									<span class="text-sm font-semibold">{memoryUsageFormatted} / {memoryLimitFormatted}</span>
								</div>
								<div class="w-full bg-secondary rounded-full h-2 overflow-hidden">
									<div class="bg-primary h-2 rounded-full transition-all duration-300" style="width: {memoryUsagePercent.toFixed(2)}%"></div>
								</div>
							</div>

							<!-- Network I/O -->
							<div class="text-xs text-muted-foreground space-y-1 pt-2 border-t">
								<div class="flex justify-between">
									<span>Network RX:</span>
									<span>{formatBytes(stats.networks?.eth0?.rx_bytes || 0)}</span>
								</div>
								<div class="flex justify-between">
									<span>Network TX:</span>
									<span>{formatBytes(stats.networks?.eth0?.tx_bytes || 0)}</span>
								</div>
							</div>
						</div>
					{:else if !container.state?.Running}
						<div class="text-center text-sm text-muted-foreground italic py-8">Container is not running. Stats unavailable.</div>
					{:else}
						<div class="text-center text-sm text-muted-foreground italic py-8">Could not load stats.</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-12 border rounded-lg shadow-sm bg-card">
			<div class="rounded-full bg-muted/50 p-4 mb-4">
				<AlertCircle class="h-8 w-8 text-muted-foreground" />
			</div>
			<h2 class="text-lg font-medium mb-2">Container Not Found</h2>
			<p class="text-center text-muted-foreground max-w-md">Could not load container data. It may have been removed or the Docker engine is not accessible.</p>
			<div class="flex gap-3 mt-6">
				<Button variant="outline" href="/containers">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Containers
				</Button>
				<Button variant="default" onclick={refreshData}>
					<RefreshCw class="h-4 w-4 mr-2" />
					Retry
				</Button>
			</div>
		</div>
	{/if}
</div>
