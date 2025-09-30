<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { ContainerRegistry } from '$lib/types/container-registry.type';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		class: className = '',
		onclick
	}: {
		item: ContainerRegistry;
		rowActions?: Snippet<[{ item: ContainerRegistry }]>;
		class?: string;
		onclick?: (item: ContainerRegistry) => void;
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
							{item.url}
						</button>
					{:else}
						<div class="truncate text-base font-medium">{item.url}</div>
					{/if}
					<div class="text-muted-foreground truncate text-sm">{item.url}</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					<StatusBadge variant={'gray'} text={'Registry'} />
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
