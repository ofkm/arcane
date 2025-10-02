<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { capitalizeFirstLetter, truncateString } from '$lib/utils/string.utils';
	import type { NetworkSummaryDto } from '$lib/types/network.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import RouteIcon from '@lucide/svelte/icons/route';
	import GlobeIcon from '@lucide/svelte/icons/globe';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showId = true,
		showStatus = true,
		showDriver = true,
		showScope = true,
		onclick
	}: {
		item: NetworkSummaryDto;
		rowActions?: Snippet<[{ item: NetworkSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showId?: boolean;
		showStatus?: boolean;
		showDriver?: boolean;
		showScope?: boolean;
		onclick?: (item: NetworkSummaryDto) => void;
	} = $props();

	function getDriverVariant(driver: string): 'blue' | 'purple' | 'red' | 'orange' | 'gray' {
		const variantMap: Record<string, 'blue' | 'purple' | 'red' | 'orange' | 'gray'> = {
			bridge: 'blue',
			overlay: 'purple',
			ipvlan: 'red',
			macvlan: 'orange'
		};
		return variantMap[driver] || 'gray';
	}

	const iconVariant = $derived<'emerald' | 'amber'>(item.inUse ? 'emerald' : 'amber');
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div
				class={cn(
					'flex shrink-0 items-center justify-center rounded-lg',
					compact ? 'size-7' : 'size-9',
					iconVariant === 'emerald' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
				)}
			>
				<NetworkIcon
					class={cn(iconVariant === 'emerald' ? 'text-emerald-500' : 'text-amber-500', compact ? 'size-3.5' : 'size-4')}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name}>
					{item.name}
				</h3>
				{#if showId}
					<p class={cn('text-muted-foreground mt-0.5 truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
						{compact ? truncateString(String(item.id), 12) : item.id}
					</p>
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#if showStatus}
					{#if item.inUse}
						<StatusBadge text={m.common_in_use()} variant="green" />
					{:else}
						<StatusBadge text={m.common_unused()} variant="amber" />
					{/if}
				{/if}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="flex flex-wrap gap-x-4 gap-y-3">
				{#if showDriver}
					<div class="flex min-w-0 flex-1 basis-[160px] items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<RouteIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.common_driver()}
							</div>
							<div class="mt-0.5 text-xs font-medium">
								<StatusBadge variant={getDriverVariant(item.driver)} text={capitalizeFirstLetter(item.driver)} />
							</div>
						</div>
					</div>
				{/if}
				{#if showScope}
					<div class="flex min-w-0 flex-1 basis-[160px] items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<GlobeIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.common_scope()}
							</div>
							<div class="mt-0.5 text-xs font-medium">
								<StatusBadge variant={item.scope === 'local' ? 'green' : 'amber'} text={capitalizeFirstLetter(item.scope)} />
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			{#if showDriver}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_driver()}:</span>
					<div class="min-w-0 flex-1">
						<StatusBadge variant={getDriverVariant(item.driver)} text={capitalizeFirstLetter(item.driver)} />
					</div>
				</div>
			{/if}
			{#if showScope}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_scope()}:</span>
					<div class="min-w-0 flex-1">
						<StatusBadge variant={item.scope === 'local' ? 'green' : 'amber'} text={capitalizeFirstLetter(item.scope)} />
					</div>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
