<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { truncateString } from '$lib/utils/string.utils';
	import type { Environment } from '$lib/types/environment.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import CloudIcon from '@lucide/svelte/icons/cloud';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showId = true,
		showApiUrl = true,
		onclick
	}: {
		item: Environment;
		rowActions?: Snippet<[{ item: Environment }]>;
		compact?: boolean;
		class?: string;
		showId?: boolean;
		showApiUrl?: boolean;
		onclick?: (item: Environment) => void;
	} = $props();
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div class={cn('flex shrink-0 items-center justify-center rounded-lg bg-emerald-500/10', compact ? 'size-7' : 'size-9')}>
				<CloudIcon class={cn('text-emerald-500', compact ? 'size-3.5' : 'size-4')} />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name || item.id}>
					{item.name || item.id}
				</h3>
				{#if showId}
					<p class={cn('text-muted-foreground mt-0.5 truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
						{compact ? truncateString(item.id, 12) : item.id}
					</p>
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				<StatusBadge variant="green" text={m.sidebar_environment_label()} size="sm" />
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="flex flex-wrap gap-x-4 gap-y-3">
				{#if showApiUrl && item.apiUrl}
					<div class="flex min-w-0 flex-1 basis-[200px] items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<CloudIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.environments_api_url()}</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.apiUrl}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			{#if showApiUrl && item.apiUrl}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.environments_api_url()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
						{item.apiUrl}
					</span>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
