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
	class="group relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5"
>
	<div
		class="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
	></div>

	<div class="relative z-10 p-4">
		<div class="mb-3 text-center">
			<h3 class="text-sm font-medium text-white/90">{title}</h3>
			{#if description}
				<p class="text-xs text-white/60">{description}</p>
			{/if}
		</div>

		<div class="flex flex-col items-center space-y-3">
			<div class="text-2xl font-bold text-white/95">{formatValue(currentValue)}</div>

			<div class="w-full max-w-[100px]">
				<Meter value={percentage} class="h-1.5 bg-white/10" />
			</div>

			<div class="text-xs font-medium text-white/70">{percentage.toFixed(1)}%</div>
		</div>
	</div>
</div>
