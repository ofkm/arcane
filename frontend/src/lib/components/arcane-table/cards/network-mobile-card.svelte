<script lang="ts">
	import { ArcaneCard, ArcaneCardHeader, ArcaneCardContent } from '$lib/components/arcane-card';
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
		showDriver = true,
		showScope = true,
		showStatus = true,
		onclick
	}: {
		item: NetworkSummaryDto;
		rowActions?: Snippet<[{ item: NetworkSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showDriver?: boolean;
		showScope?: boolean;
		showStatus?: boolean;
		onclick?: (item: NetworkSummaryDto) => void;
	} = $props();

	const iconVariant = $derived<'emerald' | 'amber'>(item.inUse ? 'emerald' : 'amber');
</script>

<ArcaneCard class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<ArcaneCardHeader icon={NetworkIcon} {iconVariant} {compact} enableHover={!!onclick}>
		<div class="flex min-w-0 flex-1 items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name}>
					{compact ? truncateString(item.name, 25) : item.name}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5 truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
					{String(item.id).substring(0, 12)}
				</p>
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
	</ArcaneCardHeader>

	{#if !compact}
		<ArcaneCardContent class="flex flex-1 flex-col p-3.5">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showDriver}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<RouteIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.common_driver()}
							</div>
							<div class="mt-0.5 text-xs font-medium">
								<StatusBadge
									variant={item.driver === 'bridge'
										? 'blue'
										: item.driver === 'overlay'
											? 'purple'
											: item.driver === 'ipvlan'
												? 'red'
												: item.driver === 'macvlan'
													? 'orange'
													: 'gray'}
									text={capitalizeFirstLetter(item.driver)}
								/>
							</div>
						</div>
					</div>
				{/if}
				{#if showScope}
					<div class="flex items-start gap-2.5">
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
		</ArcaneCardContent>
	{:else}
		<ArcaneCardContent class="flex flex-1 flex-col space-y-1.5 p-2">
			{#if showDriver}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_driver()}:</span>
					<div class="min-w-0 flex-1">
						<StatusBadge
							variant={item.driver === 'bridge'
								? 'blue'
								: item.driver === 'overlay'
									? 'purple'
									: item.driver === 'ipvlan'
										? 'red'
										: item.driver === 'macvlan'
											? 'orange'
											: 'gray'}
							text={capitalizeFirstLetter(item.driver)}
						/>
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
		</ArcaneCardContent>
	{/if}
</ArcaneCard>
