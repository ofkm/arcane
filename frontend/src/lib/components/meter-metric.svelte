<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Meter from '$lib/components/ui/meter/meter.svelte';

	interface MetricDataPoint {
		date: Date;
		value: number;
	}

	interface Props {
		title: string;
		description?: string;
		currentValue: number;
		data: MetricDataPoint[];
		unit?: string;
		formatValue?: (value: number) => string;
		color?: string;
		maxValue?: number;
	}

	let {
		title,
		description,
		currentValue,
		data,
		unit = '',
		formatValue = (v) => `${v.toFixed(1)}${unit}`,
		color = 'var(--chart-1)',
		maxValue = 100
	}: Props = $props();

	const percentage = $derived((currentValue / maxValue) * 100);
</script>

<div
	class="group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white/95 shadow-2xl shadow-black/10 backdrop-blur-sm transition-all duration-300 hover:border-gray-300/60 hover:shadow-3xl hover:shadow-black/15 dark:border-gray-800/50 dark:bg-gray-950/95 dark:shadow-black/30 dark:hover:border-gray-700/60"
>
	<!-- Header Section with Gradient -->
	<div
		class="bg-gradient-to-br from-gray-50 to-slate-50/30 p-4 dark:from-gray-900/20 dark:to-slate-900/10"
	>
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25"
			>
				<div class="text-sm font-bold text-primary-foreground">📊</div>
			</div>
			<div>
				<div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
				{#if description}
					<div class="text-xs text-gray-700/80 dark:text-gray-300/80">{description}</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Content Section -->
	<div class="bg-white/90 p-4 dark:bg-gray-950/90">
		<div class="space-y-3">
			<div class="text-center">
				<div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
					{formatValue(currentValue)}
				</div>
			</div>

			<div class="flex justify-center">
				<div class="w-full max-w-[120px]">
					<Meter value={percentage} class="h-2 bg-gray-200 dark:bg-gray-800" />
				</div>
			</div>

			<div class="rounded-lg bg-primary/10 p-3 dark:bg-primary/20">
				<div class="text-xs text-center font-medium leading-relaxed text-primary dark:text-primary">
					{percentage.toFixed(1)}% of maximum capacity
				</div>
			</div>
		</div>
	</div>
</div>
