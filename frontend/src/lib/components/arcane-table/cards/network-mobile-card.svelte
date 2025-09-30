<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { NetworkSummaryDto } from '$lib/types/network.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		class: className = '',
		onclick
	}: {
		item: NetworkSummaryDto;
		rowActions?: Snippet<[{ item: NetworkSummaryDto }]>;
		class?: string;
		onclick?: (item: NetworkSummaryDto) => void;
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
							{item.name}
						</button>
					{:else}
						<a class="block truncate text-base font-medium hover:underline" href="/networks/{item.id}/">
							{item.name}
						</a>
					{/if}
					<div class="text-muted-foreground truncate font-mono text-sm">
						{String(item.id).substring(0, 12)}
					</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					{#if item.inUse}
						<StatusBadge text={m.common_in_use()} variant="green" />
					{:else}
						<StatusBadge text={m.common_unused()} variant="amber" />
					{/if}
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<div class="flex items-start justify-between gap-2">
					<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
						{m.common_driver()}:
					</span>
					<div class="min-w-0 flex-1 text-right text-sm">
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

				<div class="flex items-start justify-between gap-2">
					<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
						{m.common_scope()}:
					</span>
					<div class="min-w-0 flex-1 text-right text-sm">
						<StatusBadge variant={item.scope === 'local' ? 'green' : 'amber'} text={capitalizeFirstLetter(item.scope)} />
					</div>
				</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
