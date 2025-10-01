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
		showAbsoluteValues?: boolean;
		formatAbsoluteValue?: (value: number) => string;
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
		showAbsoluteValues = false,
		formatAbsoluteValue = (v) => v.toString()
	}: Props = $props();

	const percentage = $derived(currentValue !== undefined && !loading && maxValue > 0 ? (currentValue / maxValue) * 100 : 0);
	const Icon = icon;
</script>

<div
	class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 group relative
           isolate flex flex-col
           overflow-hidden rounded-xl border
           shadow-sm ring-1 ring-inset backdrop-blur-sm transition-all
           duration-300 hover:shadow-md dark:shadow-none"
>
	<div class="flex-none bg-gradient-to-br from-gray-50 to-slate-50/30 p-3 dark:from-gray-900/20 dark:to-slate-900/10">
		<div class="flex items-center gap-2.5">
			<div
				class="from-primary to-primary/80 shadow-primary/25 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-lg"
			>
				{#if loading}
					<LoaderCircleIcon class="size-4 animate-spin text-white" />
				{:else}
					<Icon class="size-4 text-white" />
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

	<div class="bg-card/90 flex flex-col justify-center p-3">
		<div class="w-full space-y-2">
			<div class="text-center">
				{#if loading}
					<div class="bg-muted mx-auto h-7 w-14 animate-pulse rounded"></div>
				{:else}
					<div class="text-foreground text-lg font-bold">
						{currentValue !== undefined ? formatValue(currentValue) : m.common_na()}
					</div>
				{/if}
			</div>

			<div class="space-y-1.5">
				{#if loading}
					<div class="bg-muted h-1.5 w-full animate-pulse rounded"></div>
				{:else}
					<Progress value={percentage} max={100} class="h-1.5" />
				{/if}

				<div class="flex items-center justify-between text-xs">
					{#if loading}
						<div class="bg-muted h-3 w-12 animate-pulse rounded"></div>
						{#if showAbsoluteValues}
							<div class="bg-muted h-3 w-20 animate-pulse rounded"></div>
						{/if}
					{:else}
						<span class="text-muted-foreground font-medium">
							{percentage.toFixed(1)}%
						</span>
						{#if showAbsoluteValues && currentValue !== undefined && maxValue !== undefined}
							<span class="text-muted-foreground/70 font-mono text-[10px]">
								{formatAbsoluteValue(currentValue)} / {formatAbsoluteValue(maxValue)}
							</span>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
