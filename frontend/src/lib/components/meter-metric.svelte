<script lang="ts">
	import * as Item from '$lib/components/ui/item';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import type { Icon as IconType } from '@lucide/svelte';
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

<Item.Root variant="outline">
	<Item.Header>
		<Item.Media variant="icon">
			{#if loading}
				<div class="bg-muted size-4 animate-pulse rounded"></div>
			{:else}
				<Icon class="text-primary" />
			{/if}
		</Item.Media>
		<Item.Content>
			<Item.Title>{title}</Item.Title>
			{#if description}
				<Item.Description>{description}</Item.Description>
			{/if}
		</Item.Content>
	</Item.Header>

	<Item.Footer>
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
	</Item.Footer>
</Item.Root>
