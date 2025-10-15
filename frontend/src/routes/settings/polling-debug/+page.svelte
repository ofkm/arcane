<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ActivityIcon from '@lucide/svelte/icons/activity';

	interface PollingDebugData {
		timestamp: string;
		settings: {
			global_enabled: boolean;
			global_interval_minutes: number;
			worker_count: number;
		};
		scheduler: {
			size: number;
			status: string;
		};
		worker_pool: {
			worker_count: number;
			queue_size: number;
			status: string;
		};
		digest_cache: {
			size: number;
			status: string;
		};
		schedules: Array<{
			project_id: string | null;
			project_name: string | null;
			next_poll_time: string;
			last_poll_time: string | null;
			last_poll_duration_ms: number | null;
			consecutive_failures: number;
			time_until_next_poll: string;
			is_overdue: boolean;
		}>;
		project_overrides: Array<{
			project_id: string;
			project_name: string;
			polling_enabled: boolean | null;
			polling_interval: number | null;
			has_schedule: boolean;
		}>;
	}

	let data: PollingDebugData | null = null;
	let loading = false;
	let error = '';
	let autoRefresh = true;
	let refreshInterval: NodeJS.Timeout | null = null;

	async function fetchDebugInfo() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/debug/polling', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			if (result.success) {
				data = result.data;
			} else {
				error = result.error || 'Failed to fetch debug info';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function startAutoRefresh() {
		if (autoRefresh && !refreshInterval) {
			refreshInterval = setInterval(fetchDebugInfo, 5000); // Refresh every 5 seconds
		}
	}

	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString();
	}

	onMount(() => {
		fetchDebugInfo();
		startAutoRefresh();
	});

	onDestroy(() => {
		stopAutoRefresh();
	});

	$: if (autoRefresh) {
		startAutoRefresh();
	} else {
		stopAutoRefresh();
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Polling System Debug</h1>
			<p class="text-muted-foreground">
				Monitor the real-time state of the image polling system
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={toggleAutoRefresh}>
				<RefreshCwIcon class={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
				{autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
			</Button>
			<Button size="sm" onclick={fetchDebugInfo} disabled={loading}>
				<RefreshCwIcon class={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
				Refresh
			</Button>
		</div>
	</div>

	{#if error}
		<Card class="border-destructive">
			<CardHeader>
				<CardTitle class="text-destructive">Error</CardTitle>
			</CardHeader>
			<CardContent>
				<p>{error}</p>
			</CardContent>
		</Card>
	{/if}

	{#if data}
		<div class="text-sm text-muted-foreground">
			Last updated: {formatTimestamp(data.timestamp)}
		</div>

		<!-- System Overview -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Global Polling</CardTitle>
					<ActivityIcon class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{data.settings.global_enabled ? 'Enabled' : 'Disabled'}
					</div>
					<p class="text-xs text-muted-foreground">
						Interval: {data.settings.global_interval_minutes}m
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Scheduler</CardTitle>
					<ClockIcon class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data.scheduler.size}</div>
					<p class="text-xs text-muted-foreground">Active schedules</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Worker Pool</CardTitle>
					<LayersIcon class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data.worker_pool.worker_count}</div>
					<p class="text-xs text-muted-foreground">
						Queue: {data.worker_pool.queue_size}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Digest Cache</CardTitle>
					<DatabaseIcon class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data.digest_cache.size}</div>
					<p class="text-xs text-muted-foreground">Cached entries</p>
				</CardContent>
			</Card>
		</div>

		<!-- Schedules -->
		<Card>
			<CardHeader>
				<CardTitle>Active Schedules</CardTitle>
				<CardDescription>
					Polling schedules stored in database and managed by the heap scheduler
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if data.schedules.length === 0}
					<p class="text-sm text-muted-foreground">No schedules found</p>
				{:else}
					<div class="space-y-3">
						{#each data.schedules as schedule}
							<div class="flex items-center justify-between rounded-lg border p-4">
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<span class="font-medium">
											{schedule.project_name || 'Unknown'}
										</span>
										{#if schedule.is_overdue}
											<Badge variant="destructive">Overdue</Badge>
										{:else}
											<Badge variant="secondary">Scheduled</Badge>
										{/if}
										{#if schedule.consecutive_failures > 0}
											<Badge variant="outline" class="bg-yellow-500/10">
												{schedule.consecutive_failures} failures
											</Badge>
										{/if}
									</div>
									<div class="text-sm text-muted-foreground">
										Next poll: {schedule.time_until_next_poll}
									</div>
									{#if schedule.last_poll_time}
										<div class="text-xs text-muted-foreground">
											Last poll: {formatTimestamp(schedule.last_poll_time)}
											{#if schedule.last_poll_duration_ms}
												({formatDuration(schedule.last_poll_duration_ms)})
											{/if}
										</div>
									{/if}
								</div>
								<div class="text-right">
									{#if schedule.project_id === null}
										<Badge>Global</Badge>
									{:else}
										<Badge variant="outline">Project</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Project Overrides -->
		{#if data.project_overrides.length > 0}
			<Card>
				<CardHeader>
					<CardTitle>Project Overrides</CardTitle>
					<CardDescription>
						Projects with custom polling settings
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#each data.project_overrides as override}
							<div class="flex items-center justify-between rounded-lg border p-4">
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<span class="font-medium">{override.project_name}</span>
										{#if override.has_schedule}
											<Badge variant="secondary">Has Schedule</Badge>
										{:else}
											<Badge variant="outline">No Schedule</Badge>
										{/if}
									</div>
									<div class="text-sm text-muted-foreground">
										{#if override.polling_enabled !== null}
											Polling: {override.polling_enabled ? 'Enabled' : 'Disabled'}
										{/if}
										{#if override.polling_interval !== null}
											| Interval: {override.polling_interval}m
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}
	{:else if !error}
		<Card>
			<CardContent class="pt-6">
				<div class="flex items-center justify-center">
					<RefreshCwIcon class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

