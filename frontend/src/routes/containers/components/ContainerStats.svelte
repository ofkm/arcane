<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { m } from '$lib/paraglide/messages';
	import bytes from 'bytes';
	import type Docker from 'dockerode';
	import type { ContainerDetailsDto } from '$lib/types/container.type';

	interface Props {
		container: ContainerDetailsDto;
		stats: Docker.ContainerStats | null;
		cpuUsagePercent: number;
		memoryUsageBytes: number;
		memoryLimitBytes: number;
		memoryUsageFormatted: string;
		memoryLimitFormatted: string;
		memoryUsagePercent: number;
	}

	let {
		container,
		stats,
		cpuUsagePercent,
		memoryUsageBytes,
		memoryLimitBytes,
		memoryUsageFormatted,
		memoryLimitFormatted,
		memoryUsagePercent
	}: Props = $props();
</script>

<Card.Root class="pt-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<Card.Title class="flex items-center gap-2 text-lg">
			<ActivityIcon class="text-primary size-5" />
			<h2>
				{m.containers_resource_metrics()}
			</h2>
		</Card.Title>
		<Card.Description>{m.containers_resource_metrics_description()}</Card.Description>
	</Card.Header>
	<Card.Content class="p-4">
		{#if stats && container.state?.running}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<div class="col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-foreground text-base font-bold">{m.dashboard_meter_cpu()}</span>
							<span class="text-muted-foreground text-sm font-semibold">{cpuUsagePercent.toFixed(2)}%</span>
						</div>
						<Progress
							value={cpuUsagePercent}
							max={100}
							class="h-3 {cpuUsagePercent > 80 ? '[&>div]:bg-destructive' : cpuUsagePercent > 60 ? '[&>div]:bg-warning' : ''}"
						/>
					</div>
				</div>

				<div class="col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
					<div class="space-y-3">
						<div class="flex items-start justify-between">
							<span class="text-foreground text-base font-bold">{m.dashboard_meter_memory()}</span>
							<div class="text-right">
								<div class="text-muted-foreground text-sm font-semibold">{memoryUsagePercent.toFixed(1)}%</div>
								<div class="text-muted-foreground text-xs">{memoryUsageFormatted} / {memoryLimitFormatted}</div>
							</div>
						</div>
						<Progress
							value={memoryUsagePercent}
							max={100}
							class="h-3 {memoryUsagePercent > 80
								? '[&>div]:bg-destructive'
								: memoryUsagePercent > 60
									? '[&>div]:bg-warning'
									: ''}"
						/>
					</div>
				</div>

				{#if stats.pids_stats && stats.pids_stats.current !== undefined}
					<div class="col-span-1">
						<div class="bg-muted/30 flex h-full flex-col justify-center rounded-lg p-4">
							<div class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
								{m.containers_process_count()}
							</div>
							<div class="text-foreground text-2xl font-bold">{stats.pids_stats.current}</div>
						</div>
					</div>
				{/if}

				<div class="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-1">
					<div class="bg-muted/30 h-full rounded-lg p-4">
						<div class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
							{m.containers_network_io()}
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<div class="text-muted-foreground text-xs font-medium">
									{m.containers_network_received()}
								</div>
								<div class="text-foreground text-sm font-bold">
									{bytes.format(stats.networks?.eth0?.rx_bytes || 0)}
								</div>
							</div>
							<div>
								<div class="text-muted-foreground text-xs font-medium">
									{m.containers_network_transmitted()}
								</div>
								<div class="text-foreground text-sm font-bold">
									{bytes.format(stats.networks?.eth0?.tx_bytes || 0)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{#if stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0}
					<div class="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-1">
						<div class="bg-muted/30 h-full rounded-lg p-4">
							<div class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
								{m.containers_block_io()}
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<div class="text-muted-foreground text-xs font-medium">
										{m.containers_block_io_read()}
									</div>
									<div class="text-foreground text-sm font-bold">
										{bytes.format(
											stats.blkio_stats.io_service_bytes_recursive
												.filter((item) => item.op === 'Read')
												.reduce((acc, item) => acc + item.value, 0)
										)}
									</div>
								</div>
								<div>
									<div class="text-muted-foreground text-xs font-medium">
										{m.containers_block_io_write()}
									</div>
									<div class="text-foreground text-sm font-bold">
										{bytes.format(
											stats.blkio_stats.io_service_bytes_recursive
												.filter((item) => item.op === 'Write')
												.reduce((acc, item) => acc + item.value, 0)
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else if !container.state?.running}
			<div class="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
				<div class="text-sm">{m.containers_stats_unavailable()}</div>
			</div>
		{:else}
			<div class="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
				<div class="text-sm">{m.containers_stats_loading()}</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
