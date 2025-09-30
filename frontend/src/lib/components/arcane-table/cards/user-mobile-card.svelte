<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import type { User } from '$lib/types/user.type';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		class: className = '',
		onclick
	}: {
		item: User;
		rowActions?: Snippet<[{ item: User }]>;
		class?: string;
		onclick?: (item: User) => void;
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
							{item.username}
						</button>
					{:else}
						<div class="truncate text-base font-medium">{item.username}</div>
					{/if}
					<div class="text-muted-foreground truncate text-sm">{item.email || 'No email'}</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					<StatusBadge variant={'blue'} text={'User'} />
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
