<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { ArcaneCard, ArcaneCardHeader } from '$lib/components/arcane-card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { truncateString } from '$lib/utils/string.utils';
	import type { Environment } from '$lib/types/environment.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import CloudIcon from '@lucide/svelte/icons/cloud';
	import TagIcon from '@lucide/svelte/icons/tag';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showId = true,
		onclick
	}: {
		item: Environment;
		rowActions?: Snippet<[{ item: Environment }]>;
		compact?: boolean;
		class?: string;
		showId?: boolean;
		onclick?: (item: Environment) => void;
	} = $props();
</script>

<ArcaneCard class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<ArcaneCardHeader icon={CloudIcon} iconVariant="emerald" {compact} enableHover={!!onclick}>
		<div class="flex min-w-0 flex-1 items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name || item.id}>
					{compact ? truncateString(item.name || item.id, 25) : item.name || item.id}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5 truncate', compact ? 'text-[10px]' : 'text-xs')}>
					{item.id}
				</p>
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				<StatusBadge variant="green" text={m.sidebar_environment_label()} size="sm" />
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>
	</ArcaneCardHeader>

	{#if !compact}
		<Card.Content class="flex flex-1 flex-col p-3.5">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showId}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<TagIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_id()}</div>
							<div class="mt-0.5 truncate font-mono text-xs font-medium">
								{item.id}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Card.Content>
	{:else}
		<Card.Content class="flex flex-1 flex-col space-y-1.5 p-2">
			{#if showId}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_id()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px] leading-tight">
						{item.id}
					</span>
				</div>
			{/if}
		</Card.Content>
	{/if}
</ArcaneCard>
