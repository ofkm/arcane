<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { PortBadge } from '$lib/components/badges/index.js';
	import { format } from 'date-fns';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		showImage = true,
		showStatus = true,
		showPorts = true,
		showCreated = true,
		baseServerUrl = '',
		compact = false,
		class: className = '',
		onclick
	}: {
		item: ContainerSummaryDto;
		rowActions?: Snippet<[{ item: ContainerSummaryDto }]>;
		showImage?: boolean;
		showStatus?: boolean;
		showPorts?: boolean;
		showCreated?: boolean;
		baseServerUrl?: string;
		compact?: boolean;
		class?: string;
		onclick?: (item: ContainerSummaryDto) => void;
	} = $props();

	function getContainerName(item: ContainerSummaryDto): string {
		if (item.names && item.names.length > 0) {
			return item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0];
		}
		return item.id.substring(0, 12);
	}

	function getStatusVariant(state: string): 'green' | 'red' | 'amber' {
		return state === 'running' ? 'green' : state === 'exited' ? 'red' : 'amber';
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
		<div class={compact ? 'space-y-2' : 'space-y-3'}>
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<a 
						class={cn(
							'block truncate font-medium hover:underline',
							compact ? 'text-sm' : 'text-base'
						)} 
						href="/containers/{item.id}/"
					>
						{getContainerName(item)}
					</a>
					{#if !compact}
						<div class="text-muted-foreground truncate font-mono text-sm">
							{String(item.id).substring(0, 12)}
						</div>
					{/if}
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					<StatusBadge
						variant={getStatusVariant(item.state)}
						text={capitalizeFirstLetter(item.state)}
					/>
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>

			{#if !compact}
				<div class="space-y-2">
					{#if showImage}
						<div class="flex items-start justify-between gap-2">
							<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
								{m.common_image()}:
							</span>
							<span class="min-w-0 flex-1 truncate text-right text-sm">
								{item.image}
							</span>
						</div>
					{/if}

					{#if showStatus && item.status}
						<div class="flex items-start justify-between gap-2">
							<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
								{m.common_status()}:
							</span>
							<span class="min-w-0 flex-1 text-right text-sm">
								{item.status}
							</span>
						</div>
					{/if}

					{#if showPorts && item.ports && item.ports.length > 0}
						<div class="flex items-start justify-between gap-2">
							<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
								{m.ports()}:
							</span>
							<div class="min-w-0 flex-1 text-right text-sm">
								<PortBadge ports={item.ports} {baseServerUrl} />
							</div>
						</div>
					{/if}

					{#if showCreated && item.created}
						<div class="flex items-start justify-between gap-2">
							<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
								{m.common_created()}:
							</span>
							<span class="min-w-0 flex-1 text-right text-sm">
								{format(new Date(item.created * 1000), 'PP p')}
							</span>
						</div>
					{/if}
				</div>
			{:else}
				{#if showImage}
					<div class="text-xs text-muted-foreground truncate">
						{item.image}
					</div>
				{/if}
				{#if showStatus && item.status}
					<div class="text-xs text-muted-foreground">
						{item.status}
					</div>
				{/if}
			{/if}
		</div>
	</Card.Content>
</Card.Root>
