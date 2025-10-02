<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { truncateString } from '$lib/utils/string.utils';
	import type { Event } from '$lib/types/event.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import BellIcon from '@lucide/svelte/icons/bell';
	import TagIcon from '@lucide/svelte/icons/tag';
	import ServerIcon from '@lucide/svelte/icons/server';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let {
		item,
		rowActions,
		formatTimestamp,
		getSeverityBadgeVariant,
		compact = false,
		class: className = '',
		showResourceId = true,
		showTimestamp = true,
		showType = true,
		onclick
	}: {
		item: Event;
		rowActions?: Snippet<[{ item: Event }]>;
		formatTimestamp: (timestamp: string) => string;
		getSeverityBadgeVariant: (severity: string) => 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';
		compact?: boolean;
		class?: string;
		showResourceId?: boolean;
		showTimestamp?: boolean;
		showType?: boolean;
		onclick?: (item: Event) => void;
	} = $props();

	function getIconVariant(severity: string): 'emerald' | 'red' | 'amber' | 'blue' | 'purple' {
		const variant = getSeverityBadgeVariant(severity);
		if (variant === 'green') return 'emerald';
		if (variant === 'red') return 'red';
		if (variant === 'amber') return 'amber';
		if (variant === 'blue') return 'blue';
		if (variant === 'purple') return 'purple';
		return 'blue';
	}

	const iconVariant = $derived(getIconVariant(item.severity));
	const severityVariant = $derived(getSeverityBadgeVariant(item.severity));
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div
				class={cn(
					'flex shrink-0 items-center justify-center rounded-lg',
					compact ? 'size-7' : 'size-9',
					iconVariant === 'emerald'
						? 'bg-emerald-500/10'
						: iconVariant === 'red'
							? 'bg-red-500/10'
							: iconVariant === 'amber'
								? 'bg-amber-500/10'
								: 'bg-blue-500/10'
				)}
			>
				<BellIcon
					class={cn(
						iconVariant === 'emerald'
							? 'text-emerald-500'
							: iconVariant === 'red'
								? 'text-red-500'
								: iconVariant === 'amber'
									? 'text-amber-500'
									: 'text-blue-500',
						compact ? 'size-3.5' : 'size-4'
					)}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.title}>
					{compact ? truncateString(item.title, 30) : item.title}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5', compact ? 'text-[10px]' : 'text-xs')}>
					{formatTimestamp(item.timestamp)}
				</p>
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				<StatusBadge variant={severityVariant} text={item.severity} size="sm" />
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showType}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<TagIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.events_col_type()}</div>
							<div class="mt-0.5 text-xs font-medium">
								<Badge variant="outline" class="text-xs">{item.type}</Badge>
							</div>
						</div>
					</div>
				{/if}
				{#if showResourceId && item.resourceId}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<ServerIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.events_col_resource()}</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.resourceId}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if showTimestamp}
				<div class="border-muted/40 mt-3 flex items-center gap-2 border-t pt-3">
					<ClockIcon class="text-muted-foreground size-3.5" />
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.events_col_time()}</span>
					<span class="text-muted-foreground ml-auto text-[11px]">
						{formatTimestamp(item.timestamp)}
					</span>
				</div>
			{/if}
		{:else}
			{#if showType}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.events_col_type()}:</span>
					<Badge variant="outline" class="text-[10px]">{item.type}</Badge>
				</div>
			{/if}
			{#if showResourceId && item.resourceId}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.events_col_resource()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
						{item.resourceId}
					</span>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
