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
	<div class="space-y-8">
		<div class="space-y-4">
			<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
				<div class="bg-primary/10 rounded-lg p-2.5">
					<ActivityIcon class="text-primary size-6" />
				</div>
				{m.containers_resource_metrics()}
			</h2>
			<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">
				Real-time performance metrics and resource utilization
			</p>
		</div>
		{#if stats && container.state?.running}
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<div class="space-y-3">
					<Card.Root>
						<Card.Content class="p-6">
							<div class="mb-4 flex justify-between">
								<span class="text-foreground text-base font-bold">{m.dashboard_meter_cpu()}</span>
								<span class="text-muted-foreground text-sm font-semibold">{cpuUsagePercent.toFixed(2)}%</span>
							</div>
							<Progress
								value={cpuUsagePercent}
								max={100}
								class="h-3 {cpuUsagePercent > 80 ? '[&>div]:bg-destructive' : cpuUsagePercent > 60 ? '[&>div]:bg-warning' : ''}"
							/>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Content class="p-6">
							<div class="mb-4 flex justify-between">
								<span class="text-foreground text-base font-bold">{m.dashboard_meter_memory()}</span>
								<span class="text-muted-foreground text-sm font-semibold"
									>{memoryUsageFormatted} / {memoryLimitFormatted} ({memoryUsagePercent.toFixed(1)}%)</span
								>
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
						</Card.Content>
					</Card.Root>

					{#if stats.pids_stats && stats.pids_stats.current !== undefined}
						<Card.Root class="hidden lg:block">
							<Card.Content class="p-6">
								<div class="flex items-center justify-between">
									<span class="text-foreground text-base font-bold">{m.containers_process_count()}</span>
									<span class="text-foreground text-2xl font-bold">{stats.pids_stats.current}</span>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				</div>

				<div class="space-y-3">
					<Card.Root>
						<Card.Content class="p-6">
							<h4 class="text-foreground mb-6 flex items-center gap-3 text-base font-bold">
								<NetworkIcon class="text-muted-foreground size-5" />
								{m.containers_network_io()}
							</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="bg-muted/30 rounded-lg p-4">
									<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
										{m.containers_network_received()}
									</div>
									<div class="text-foreground mt-2 text-lg font-bold">
										{bytes.format(stats.networks?.eth0?.rx_bytes || 0)}
									</div>
								</div>
								<div class="bg-muted/30 rounded-lg p-4">
									<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
										{m.containers_network_transmitted()}
									</div>
									<div class="text-foreground mt-2 text-lg font-bold">
										{bytes.format(stats.networks?.eth0?.tx_bytes || 0)}
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					{#if stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0}
						<Card.Root>
							<Card.Content class="p-6">
								<h4 class="text-foreground mb-6 text-base font-bold">{m.containers_block_io()}</h4>
								<div class="grid grid-cols-2 gap-4">
									<div class="bg-muted/30 rounded-lg p-4">
										<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
											{m.containers_block_io_read()}
										</div>
										<div class="text-foreground mt-2 text-lg font-bold">
											{bytes.format(
												stats.blkio_stats.io_service_bytes_recursive
													.filter((item) => item.op === 'Read')
													.reduce((acc, item) => acc + item.value, 0)
											)}
										</div>
									</div>
									<div class="bg-muted/30 rounded-lg p-4">
										<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
											{m.containers_block_io_write()}
										</div>
										<div class="text-foreground mt-2 text-lg font-bold">
											{bytes.format(
												stats.blkio_stats.io_service_bytes_recursive
													.filter((item) => item.op === 'Write')
													.reduce((acc, item) => acc + item.value, 0)
											)}
										</div>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				</div>

				{#if stats.pids_stats && stats.pids_stats.current !== undefined}
					<Card.Root class="block lg:hidden">
						<Card.Content class="p-6">
							<div class="flex items-center justify-between">
								<span class="text-foreground text-base font-bold">{m.containers_process_count()}</span>
								<span class="text-foreground text-2xl font-bold">{stats.pids_stats.current}</span>
							</div>
						</Card.Content>
					</Card.Root>
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
	</div>
</section>
