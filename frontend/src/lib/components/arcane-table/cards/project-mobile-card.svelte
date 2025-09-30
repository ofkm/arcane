<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { format } from 'date-fns';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { Project } from '$lib/types/project.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		class: className = '',
		onclick
	}: {
		item: Project;
		rowActions?: Snippet<[{ item: Project }]>;
		class?: string;
		onclick?: (item: Project) => void;
	} = $props();

	function getStatusVariant(status: string): 'green' | 'red' | 'amber' {
		return status === 'running' ? 'green' : status === 'exited' ? 'red' : 'amber';
	}

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
						<a class="block truncate text-base font-medium hover:underline" href="/projects/{item.id}/">
							{item.name}
						</a>
					{/if}
					<div class="text-muted-foreground truncate text-sm">
						{item.id}
					</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					<StatusBadge variant={getStatusVariant(item.status)} text={capitalizeFirstLetter(item.status)} />
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<div class="flex items-start justify-between gap-2">
					<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
						{m.common_status()}:
					</span>
					<span class="min-w-0 flex-1 text-right text-sm">
						{item.services?.length || 0} services
					</span>
				</div>

				{#if item.updatedAt}
					<div class="flex items-start justify-between gap-2">
						<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
							{m.common_created()}:
						</span>
						<span class="min-w-0 flex-1 text-right text-sm">
							{format(new Date(item.updatedAt), 'PP p')}
						</span>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
