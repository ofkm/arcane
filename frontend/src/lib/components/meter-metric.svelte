<script lang="ts">
	import { Progress } from '$lib/components/ui/progress/index.js';
	import type { Icon as IconType } from '@lucide/svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { m } from '$lib/paraglide/messages';

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
           isolate flex aspect-square flex-col
           overflow-hidden rounded-xl border
           shadow-sm ring-1 ring-inset backdrop-blur-sm transition-all
           duration-300 hover:shadow-md sm:aspect-auto dark:shadow-none"
>
	<div class="flex-none bg-gradient-to-br from-gray-50 to-slate-50/30 p-3 sm:p-4 dark:from-gray-900/20 dark:to-slate-900/10">
		<div class="flex items-center gap-3">
			<div
				class="from-primary to-primary/80 shadow-primary/25 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br shadow-lg sm:h-10 sm:w-10"
			>
				{#if loading}
					<LoaderCircleIcon class="size-4 animate-spin text-white sm:size-5" />
				{:else}
					<Icon class="size-4 text-white sm:size-5" />
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<div class="text-foreground text-sm font-semibold">{title}</div>
				{#if description}
					<div class="text-muted-foreground text-xs">{description}</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="bg-card/90 flex flex-1 flex-col justify-center p-3 sm:p-4">
		<div class="w-full space-y-2 sm:space-y-3">
			<div class="text-center">
				{#if loading}
					<div class="bg-muted mx-auto h-8 w-16 animate-pulse rounded"></div>
				{:else}
					<div class="text-foreground text-xl font-bold sm:text-2xl">
						{currentValue !== undefined ? formatValue(currentValue) : m.common_na()}
					</div>
				{/if}
			</div>

			<div class="flex justify-center">
				<div class="w-full max-w-full sm:max-w-[120px]">
					{#if loading}
						<div class="bg-muted h-2 w-full animate-pulse rounded"></div>
					{:else}
						<Progress value={percentage} max={100} class="h-2" />
					{/if}
				</div>
			</div>

			<div class="bg-primary/10 dark:bg-primary/20 mt-auto flex min-h-[44px] items-center justify-center rounded-lg p-3 sm:p-4">
				{#if loading}
					<div class="bg-muted mx-auto h-3 w-20 animate-pulse rounded"></div>
				{:else}
					<div class="text-primary dark:text-primary text-center text-xs font-medium leading-tight sm:text-sm">
						{footerText ?? m.meter_footer_usage({ percent: Number(percentage).toFixed(1) })}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
