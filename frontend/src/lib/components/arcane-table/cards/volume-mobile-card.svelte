<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { ArcaneCard, ArcaneCardHeader } from '$lib/components/arcane-card';
	import { format } from 'date-fns';
	import { truncateString } from '$lib/utils/string.utils';
	import type { VolumeSummaryDto } from '$lib/types/volume.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showCreated = true,
		showDriver = true,
		showStatus = true,
		onclick
	}: {
		item: VolumeSummaryDto;
		rowActions?: Snippet<[{ item: VolumeSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showCreated?: boolean;
		showDriver?: boolean;
		showStatus?: boolean;
		onclick?: (item: VolumeSummaryDto) => void;
	} = $props();

	const iconVariant = $derived<'emerald' | 'amber'>(item.inUse ? 'emerald' : 'amber');
</script>

<ArcaneCard class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<ArcaneCardHeader icon={DatabaseIcon} {iconVariant} {compact} enableHover={!!onclick}>
		<div class="flex min-w-0 flex-1 items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name}>
					{compact ? truncateString(item.name, 25) : truncateString(item.name, 40)}
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
		<Card.Content class="flex flex-1 flex-col p-3.5">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showDriver}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<DatabaseIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.common_driver()}
							</div>
							<div class="mt-0.5 text-xs font-medium">
								{item.driver}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if showCreated && item.createdAt}
				<div class="border-muted/40 mt-3 flex items-center gap-2 border-t pt-3">
					<CalendarIcon class="text-muted-foreground size-3.5" />
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
						{m.common_created()}
					</span>
					<span class="text-muted-foreground ml-auto font-mono text-[11px]">
						{format(new Date(String(item.createdAt)), 'PP p')}
					</span>
				</div>
			{/if}
		</Card.Content>
	{:else}
		<Card.Content class="flex flex-1 flex-col space-y-1.5 p-2">
			{#if showDriver}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_driver()}:</span>
					<span class="text-muted-foreground truncate text-[11px] leading-tight">
						{item.driver}
					</span>
				</div>
			{/if}
			{#if showCreated && item.createdAt}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_created()}:</span>
					<span class="text-muted-foreground truncate font-mono text-[11px] leading-tight">
						{format(new Date(String(item.createdAt)), 'PP')}
					</span>
				</div>
			{/if}
		</Card.Content>
	{/if}
</ArcaneCard>
