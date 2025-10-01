<script lang="ts">
	import { Progress } from '$lib/components/ui/progress/index.js';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { m } from '$lib/paraglide/messages';
	import bytes from 'bytes';

	let {
		diskUsage,
		diskTotal,
		loading = false,
		class: className
	}: {
		diskUsage?: number;
		diskTotal?: number;
		loading?: boolean;
		class?: string;
	} = $props();

	const percentage = $derived(
		!loading && diskUsage !== undefined && diskTotal !== undefined && diskTotal > 0 ? (diskUsage / diskTotal) * 100 : 0
	);

	const diskFree = $derived(diskUsage !== undefined && diskTotal !== undefined ? diskTotal - diskUsage : 0);

	function formatBytes(value: number): string {
		return bytes.format(value, { unitSeparator: ' ' }) ?? '-';
	}
</script>

<div
	class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 group relative
           isolate flex flex-col
           overflow-hidden rounded-xl border
           shadow-sm ring-1 ring-inset backdrop-blur-sm transition-all
           duration-300 hover:shadow-md dark:shadow-none {className}"
>
	<div
		class="flex items-center gap-3 bg-gradient-to-br from-gray-50 to-slate-50/30 p-3 sm:p-4 dark:from-gray-900/20 dark:to-slate-900/10"
	>
		<div
			class="from-primary to-primary/80 shadow-primary/25 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-lg sm:size-10"
		>
			{#if loading}
				<LoaderCircleIcon class="size-4 animate-spin text-white sm:size-5" />
			{:else}
				<HardDriveIcon class="size-4 text-white sm:size-5" />
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<div class="text-foreground text-sm font-semibold">{m.dashboard_meter_disk()}</div>
			<div class="text-muted-foreground text-xs">{m.dashboard_meter_disk_desc()}</div>
		</div>
	</div>

	<div class="flex flex-1 items-center p-3 sm:p-4">
		<div class="flex w-full items-center gap-4">
			<div class="flex-1 space-y-2">
				{#if loading}
					<div class="bg-muted h-2 w-full animate-pulse rounded"></div>
				{:else}
					<Progress value={percentage} max={100} class="h-2" />
				{/if}

				<div class="flex items-center justify-between text-xs">
					{#if loading}
						<div class="bg-muted h-3 w-16 animate-pulse rounded"></div>
						<div class="bg-muted h-3 w-24 animate-pulse rounded"></div>
					{:else}
						<span class="text-muted-foreground font-medium">
							{percentage.toFixed(1)}%
						</span>
						<span class="text-muted-foreground/70 font-mono">
							{formatBytes(diskUsage ?? 0)} / {formatBytes(diskTotal ?? 0)}
						</span>
					{/if}
				</div>
			</div>

			<div class="bg-muted/50 hidden shrink-0 gap-4 rounded-lg p-3 sm:flex">
				<div class="space-y-0.5">
					{#if loading}
						<div class="bg-muted h-3 w-12 animate-pulse rounded"></div>
						<div class="bg-muted h-4 w-16 animate-pulse rounded"></div>
					{:else}
						<div class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
							{m.dashboard_meter_disk_used()}
						</div>
						<div class="text-foreground text-sm font-semibold">
							{formatBytes(diskUsage ?? 0)}
						</div>
					{/if}
				</div>

				<div class="space-y-0.5">
					{#if loading}
						<div class="bg-muted h-3 w-12 animate-pulse rounded"></div>
						<div class="bg-muted h-4 w-16 animate-pulse rounded"></div>
					{:else}
						<div class="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
							{m.dashboard_meter_disk_free()}
						</div>
						<div class="text-foreground text-sm font-semibold">
							{formatBytes(diskFree)}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
