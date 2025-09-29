<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import NetworkIcon from '@lucide/svelte/icons/network';
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

<section class="scroll-mt-20">
	<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
		<ActivityIcon class="size-5" />
		{m.containers_resource_metrics()}
	</h2>

	<Card.Root class="rounded-lg border shadow-sm">
		<Card.Content class="p-6">
			{#if stats && container.state?.running}
				<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
					<div class="space-y-6">
						<div class="space-y-2">
							<div class="flex justify-between">
								<span class="text-sm font-medium">{m.dashboard_meter_cpu()}</span>
								<span class="text-muted-foreground text-sm">{cpuUsagePercent.toFixed(2)}%</span>
							</div>
							<Progress
								value={cpuUsagePercent}
								max={100}
								class="h-2 {cpuUsagePercent > 80 ? '[&>div]:bg-destructive' : cpuUsagePercent > 60 ? '[&>div]:bg-warning' : ''}"
							/>
						</div>

						<div class="space-y-2">
							<div class="flex justify-between">
								<span class="text-sm font-medium">{m.dashboard_meter_memory()}</span>
								<span class="text-muted-foreground text-sm"
									>{memoryUsageFormatted} / {memoryLimitFormatted} ({memoryUsagePercent.toFixed(1)}%)</span
								>
							</div>
							<Progress
								value={memoryUsagePercent}
								max={100}
								class="h-2 {memoryUsagePercent > 80
									? '[&>div]:bg-destructive'
									: memoryUsagePercent > 60
										? '[&>div]:bg-warning'
										: ''}"
							/>
						</div>
					</div>

					<div class="space-y-6">
						<div>
							<h4 class="mb-4 flex items-center gap-2 font-medium">
								<NetworkIcon class="size-4" />
								{m.containers_network_io()}
							</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="bg-muted/30 rounded p-4">
									<div class="text-muted-foreground text-sm">{m.containers_network_received()}</div>
									<div class="mt-1 font-medium">
										{bytes.format(stats.networks?.eth0?.rx_bytes || 0)}
									</div>
								</div>
								<div class="bg-muted/30 rounded p-4">
									<div class="text-muted-foreground text-sm">{m.containers_network_transmitted()}</div>
									<div class="mt-1 font-medium">
										{bytes.format(stats.networks?.eth0?.tx_bytes || 0)}
									</div>
								</div>
							</div>
						</div>

						{#if stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0}
							<div>
								<h4 class="mb-4 font-medium">{m.containers_block_io()}</h4>
								<div class="grid grid-cols-2 gap-4">
									<div class="bg-muted/30 rounded p-4">
										<div class="text-muted-foreground text-sm">{m.containers_block_io_read()}</div>
										<div class="mt-1 font-medium">
											{bytes.format(
												stats.blkio_stats.io_service_bytes_recursive
													.filter((item) => item.op === 'Read')
													.reduce((acc, item) => acc + item.value, 0)
											)}
										</div>
									</div>
									<div class="bg-muted/30 rounded p-4">
										<div class="text-muted-foreground text-sm">{m.containers_block_io_write()}</div>
										<div class="mt-1 font-medium">
											{bytes.format(
												stats.blkio_stats.io_service_bytes_recursive
													.filter((item) => item.op === 'Write')
													.reduce((acc, item) => acc + item.value, 0)
											)}
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				{#if stats.pids_stats && stats.pids_stats.current !== undefined}
					<div class="mt-6 border-t pt-6">
						<div class="text-sm">
							<span class="text-muted-foreground">{m.containers_process_count()}</span>
							<span class="ml-2 font-medium">{stats.pids_stats.current}</span>
						</div>
					</div>
				{/if}
			{:else if !container.state?.running}
				<div class="text-muted-foreground py-12 text-center">{m.containers_stats_unavailable()}</div>
			{:else}
				<div class="text-muted-foreground py-12 text-center">{m.containers_stats_loading()}</div>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
