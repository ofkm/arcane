<script lang="ts">
	import Meter from '$lib/components/ui/meter/meter.svelte';
	import type { Icon as IconType } from '@lucide/svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	interface Props {
		title: string;
		description?: string;
		currentValue?: number;
		unit?: string;
		formatValue?: (value: number) => string;
		maxValue?: number;
		icon: typeof IconType;
		loading?: boolean;
		footerText?: string;
	}

	let {
		title,
		description,
		currentValue,
		unit = '',
		formatValue = (v) => `${v.toFixed(1)}${unit}`,
		maxValue = 100,
		icon,
		loading = false,
		footerText
	}: Props = $props();

	const percentage = $derived(currentValue !== undefined && !loading && maxValue > 0 ? (currentValue / maxValue) * 100 : 0);
	const Icon = icon;
</script>

<div
	class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 group relative
	       isolate overflow-hidden rounded-xl border
	       shadow-sm ring-1 ring-inset
	       backdrop-blur-sm transition-all duration-300 hover:shadow-md dark:shadow-none"
>
	<div class="bg-gradient-to-br from-gray-50 to-slate-50/30 p-4 dark:from-gray-900/20 dark:to-slate-900/10">
		<div class="flex items-center gap-3">
			<div
				class="from-primary to-primary/80 shadow-primary/25 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br shadow-lg"
			>
				{#if loading}
					<LoaderCircleIcon class="size-5 animate-spin text-white" />
				{:else}
					<Icon class="size-5 text-white" />
				{/if}
			</div>
			<div class="min-w-0 flex-1">
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
				{#if loading}
					<div class="bg-muted mx-auto h-8 w-16 animate-pulse rounded"></div>
				{:else}
					<div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
						{currentValue !== undefined ? formatValue(currentValue) : '--'}
					</div>
				{/if}
			</div>

			<div class="flex justify-center">
				<div class="w-full max-w-[120px]">
					{#if loading}
						<div class="bg-muted h-2 w-full animate-pulse rounded"></div>
					{:else}
						<Meter value={percentage} class="h-2 bg-gray-200 dark:bg-gray-800" />
					{/if}
				</div>
			</div>

			<div class="bg-primary/10 dark:bg-primary/20 rounded-lg p-3">
				{#if loading}
					<div class="bg-muted mx-auto h-3 w-20 animate-pulse rounded"></div>
				{:else}
					<div class="text-primary dark:text-primary text-center text-xs font-medium leading-relaxed">
						{footerText ?? `${percentage.toFixed(1)}% of resources being used`}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
