<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { ArcChart, Text } from 'layerchart';

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

	const chartData = $derived([{ metric: title, value: currentValue, color }]);

	const chartConfig = {
		value: { label: 'Value' },
		metric: { label: title, color }
	} satisfies Chart.ChartConfig;
</script>

<Card.Root class="flex flex-col">
	<Card.Header class="items-center pb-1">
		<Card.Title class="text-sm">{title}</Card.Title>
		{#if description}
			<Card.Description class="text-xs text-center">{description}</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content class="p-1">
		<Chart.Container config={chartConfig} class="mx-auto aspect-square max-h-[180px]">
			<ArcChart
				label="metric"
				value="value"
				outerRadius={-8}
				innerRadius={-4}
				padding={5}
				range={[90, -270]}
				{maxValue}
				cornerRadius={10}
				series={chartData.map((d) => ({
					key: d.metric,
					color: d.color,
					data: [d]
				}))}
				props={{
					arc: { track: { fill: 'var(--muted)' }, motion: 'tween' },
					tooltip: { context: { hideDelay: 350 } }
				}}
				tooltip={false}
			>
				{#snippet belowMarks()}
					<circle cx="0" cy="0" r="45" class="fill-background" />
				{/snippet}
				{#snippet aboveMarks()}
					<Text
						value={formatValue(currentValue)}
						textAnchor="middle"
						verticalAnchor="middle"
						class="fill-foreground text-xl! font-bold"
						dy={-2}
					/>
					<Text
						value={unit ? unit.toUpperCase() : 'COUNT'}
						textAnchor="middle"
						verticalAnchor="middle"
						class="fill-muted-foreground! text-xs!"
						dy={12}
					/>
				{/snippet}
			</ArcChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
