<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Cpu as GpuIcon } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import type { GPUStats } from '$lib/types/system-stats.type';

	interface Props {
		gpus?: GPUStats[];
		loading?: boolean;
	}

	let { gpus, loading = false }: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 GB';
	const gb = bytes / 1024; // MB to GB (using 1024 for binary)
		return `${gb.toFixed(1)} GB`;
	}

	function getPercentage(used: number, total: number): number {
		if (total === 0) return 0;
		return (used / total) * 100;
	}
</script>

<Card.Root>
	{#snippet children()}
		<Card.Header icon={GpuIcon} iconVariant="primary" compact {loading}>
			{#snippet children()}
				<div class="min-w-0 flex-1">
					<div class="text-foreground text-sm font-semibold">GPU</div>
					{#if gpus && gpus.length > 0}
						<div class="text-muted-foreground text-xs">
							{gpus.length} {gpus.length === 1 ? 'device' : 'devices'}
						</div>
					{/if}
				</div>
			{/snippet}
		</Card.Header>

		<Card.Content class="flex flex-col justify-center p-3">
			{#if loading}
				<div class="w-full space-y-3">
					<div class="bg-muted h-16 w-full animate-pulse rounded"></div>
				</div>
			{:else if !gpus || gpus.length === 0}
				<div class="text-muted-foreground text-center text-xs">
					{m.common_na()}
				</div>
			{:else}
				<div class="w-full space-y-3">
					{#each gpus as gpu}
						<div class="space-y-1.5">
							<div class="flex items-center justify-between">
								<span class="text-foreground text-xs font-medium">{gpu.name}</span>
								<span class="text-muted-foreground text-[10px] font-mono">
									GPU {gpu.index}
								</span>
							</div>
							<div class="text-center">
								<div class="text-foreground text-sm font-bold">
									{formatBytes(gpu.memoryUsed)}
								</div>
							</div>
							<Progress value={getPercentage(gpu.memoryUsed, gpu.memoryTotal)} max={100} class="h-1.5" />
							<div class="flex items-center justify-between text-xs">
								<span class="text-muted-foreground font-medium">
									{getPercentage(gpu.memoryUsed, gpu.memoryTotal).toFixed(1)}%
								</span>
								<span class="text-muted-foreground/70 font-mono text-[10px]">
									{formatBytes(gpu.memoryUsed)} / {formatBytes(gpu.memoryTotal)}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	{/snippet}
</Card.Root>
