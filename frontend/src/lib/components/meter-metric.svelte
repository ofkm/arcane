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
				<div class="text-foreground text-sm font-semibold">{title}</div>
				{#if description}
					<div class="text-muted-foreground text-xs">{description}</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="bg-card/90 p-4">
		<div class="space-y-3">
			<div class="text-center">
				{#if loading}
					<div class="bg-muted mx-auto h-8 w-16 animate-pulse rounded"></div>
				{:else}
					<div class="text-foreground text-2xl font-bold">
						{currentValue !== undefined ? formatValue(currentValue) : m.common_na()}
					</div>
				{/if}
			</div>

			<div class="flex justify-center">
				<div class="w-full max-w-[120px]">
					{#if loading}
						<div class="bg-muted h-2 w-full animate-pulse rounded"></div>
					{:else}
						<Progress value={percentage} max={100} class="h-2" />
					{/if}
				</div>
			</div>

			<div class="bg-primary/10 dark:bg-primary/20 rounded-lg p-3">
				{#if loading}
					<div class="bg-muted mx-auto h-3 w-20 animate-pulse rounded"></div>
				{:else}
					<div class="text-primary dark:text-primary text-center text-xs font-medium leading-relaxed">
						{footerText ?? m.meter_footer_usage({ percent: percentage.toFixed(1) })}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
