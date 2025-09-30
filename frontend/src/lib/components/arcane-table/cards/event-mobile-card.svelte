<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Event } from '$lib/types/event.type';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		formatTimestamp,
		getSeverityBadgeVariant,
		class: className = '',
		onclick
	}: {
		item: Event;
		rowActions?: Snippet<[{ item: Event }]>;
		formatTimestamp: (timestamp: string) => string;
		getSeverityBadgeVariant: (severity: string) => 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray';
		class?: string;
		onclick?: (item: Event) => void;
	} = $props();

	function handleClick(e: MouseEvent) {
		if (onclick) {
			// Check if the clicked element is interactive (button, link, or has onclick)
			const target = e.target as HTMLElement;
			const isInteractive = target.closest('button, a, [onclick], [role="button"]');

			if (!isInteractive) {
				onclick(item);
			}
		}
	}
</script>

<Card.Root
	class={cn('p-4', onclick ? 'hover:bg-muted/50 cursor-pointer transition-colors' : '', className)}
	onclick={onclick ? handleClick : undefined}
>
	<Card.Content class="p-0">
		<div class="space-y-3">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					{#if onclick}
						<button
							class="block truncate text-left text-base font-medium hover:underline"
							type="button"
							onclick={() => onclick?.(item)}
						>
							{item.title}
						</button>
					{:else}
						<div class="truncate text-base font-medium">{item.title}</div>
					{/if}
					<div class="text-muted-foreground text-sm">{formatTimestamp(item.timestamp)}</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					<StatusBadge variant={getSeverityBadgeVariant(item.severity)} text={item.severity} />
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>
			<div class="space-y-2">
				<div class="flex items-start justify-between gap-2">
					<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">Type:</span>
					<Badge variant="outline" class="text-xs">{item.type}</Badge>
				</div>
				{#if item.resourceId}
					<div class="flex items-start justify-between gap-2">
						<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">Resource:</span>
						<span class="min-w-0 flex-1 truncate text-right text-sm">{item.resourceId}</span>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
