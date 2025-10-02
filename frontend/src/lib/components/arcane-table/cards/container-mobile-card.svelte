<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { PortBadge } from '$lib/components/badges/index.js';
	import { format } from 'date-fns';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ImageIcon from '@lucide/svelte/icons/image';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showId = true,
		showImage = true,
		showState = true,
		showStatus = true,
		showPorts = true,
		showCreated = true,
		baseServerUrl = '',
		onclick
	}: {
		item: ContainerSummaryDto;
		rowActions?: Snippet<[{ item: ContainerSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showId?: boolean;
		showImage?: boolean;
		showState?: boolean;
		showStatus?: boolean;
		showPorts?: boolean;
		showCreated?: boolean;
		baseServerUrl?: string;
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

	function getIconVariant(state: string): 'emerald' | 'red' | 'amber' {
		return state === 'running' ? 'emerald' : state === 'exited' ? 'red' : 'amber';
	}

	const containerName = $derived(getContainerName(item));
	const statusVariant = $derived(getStatusVariant(item.state));
	const iconVariant = $derived(getIconVariant(item.state));
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div
				class={cn(
					'flex shrink-0 items-center justify-center rounded-lg',
					compact ? 'size-7' : 'size-9',
					iconVariant === 'emerald' ? 'bg-emerald-500/10' : iconVariant === 'red' ? 'bg-red-500/10' : 'bg-amber-500/10'
				)}
			>
				<BoxIcon
					class={cn(
						iconVariant === 'emerald' ? 'text-emerald-500' : iconVariant === 'red' ? 'text-red-500' : 'text-amber-500',
						compact ? 'size-3.5' : 'size-4'
					)}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-[13px]' : 'text-base')}>
					{containerName}
				</h3>
				{#if showId}
					<div class="text-muted-foreground mt-0.5 flex items-center gap-2">
						<span class={cn('truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
							{String(item.id).substring(0, 12)}
						</span>
					</div>
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#if showState}
					<StatusBadge variant={statusVariant} text={capitalizeFirstLetter(item.state)} size="sm" />
				{/if}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showImage}
					<div class="flex items-start gap-2.5">
						<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
							<ImageIcon class="size-3.5 text-blue-500" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.common_image()}
							</div>
							<div class="mt-0.5 truncate font-mono text-xs font-medium">
								{item.image}
							</div>
						</div>
					</div>
				{/if}

				{#if showStatus && item.status}
					<div class="flex items-start gap-2.5">
						<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
							<ClockIcon class="size-3.5 text-purple-500" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.common_status()}
							</div>
							<div class="mt-0.5 text-xs font-medium">
								{item.status}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if showPorts && item.ports && item.ports.length > 0}
				<div class="mt-3 flex items-start gap-2.5">
					<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
						<NetworkIcon class="size-3.5 text-sky-500" />
					</div>
					<div class="min-w-0 flex-1">
						<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
							{m.ports()}
						</div>
						<div class="mt-1">
							<PortBadge ports={item.ports} {baseServerUrl} />
						</div>
					</div>
				</div>
			{/if}

			{#if showCreated && item.created}
				<div class="border-muted/40 mt-3 flex items-center gap-2 border-t pt-3">
					<ClockIcon class="text-muted-foreground size-3.5" />
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
						{m.common_created()}
					</span>
					<span class="text-muted-foreground ml-auto font-mono text-[11px]">
						{format(new Date(item.created * 1000), 'PP p')}
					</span>
				</div>
			{/if}
		{:else}
			{#if showImage}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_image()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px] leading-tight">
						{item.image}
					</span>
				</div>
			{/if}
			{#if showId}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_id()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px] leading-tight">
						{String(item.id).substring(0, 12)}
					</span>
				</div>
			{/if}
			{#if showStatus && item.status}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_status()}:</span>
					<span class="text-muted-foreground truncate text-[11px] leading-tight">
						{item.status}
					</span>
				</div>
			{/if}
			{#if showState}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_state()}:</span>
					<StatusBadge variant={statusVariant} text={capitalizeFirstLetter(item.state)} size="sm" />
				</div>
			{/if}
			{#if showPorts && item.ports && item.ports.length > 0}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.ports()}:</span>
					<div class="min-w-0 flex-1">
						<PortBadge ports={item.ports} {baseServerUrl} />
					</div>
				</div>
			{/if}
			{#if showCreated && item.created}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_created()}:</span>
					<span class="text-muted-foreground font-mono text-[11px] leading-tight">
						{format(new Date(item.created * 1000), 'PP')}
					</span>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
