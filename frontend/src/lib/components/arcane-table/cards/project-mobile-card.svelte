<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { format } from 'date-fns';
	import { capitalizeFirstLetter, truncateString } from '$lib/utils/string.utils';
	import type { Project } from '$lib/types/project.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showId = true,
		showServiceCount = true,
		showStatus = true,
		showCreatedAt = true,
		onclick
	}: {
		item: Project;
		rowActions?: Snippet<[{ item: Project }]>;
		compact?: boolean;
		class?: string;
		showId?: boolean;
		showServiceCount?: boolean;
		showStatus?: boolean;
		showCreatedAt?: boolean;
		onclick?: (item: Project) => void;
	} = $props();

	function getStatusVariant(status: string): 'green' | 'red' | 'amber' {
		return status === 'running' ? 'green' : status === 'exited' ? 'red' : 'amber';
	}

	function getIconVariant(status: string): 'emerald' | 'red' | 'amber' {
		return status === 'running' ? 'emerald' : status === 'exited' ? 'red' : 'amber';
	}

	const statusVariant = $derived(getStatusVariant(item.status));
	const iconVariant = $derived(getIconVariant(item.status));
	const serviceCount = $derived(item.serviceCount ? Number(item.serviceCount) : (item.services?.length ?? 0));
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
				<FolderIcon
					class={cn(
						iconVariant === 'emerald' ? 'text-emerald-500' : iconVariant === 'red' ? 'text-red-500' : 'text-amber-500',
						compact ? 'size-3.5' : 'size-4'
					)}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name}>
					{item.name}
				</h3>
				{#if showId}
					<p class={cn('text-muted-foreground mt-0.5 truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
						{compact ? truncateString(item.id, 12) : item.id}
					</p>
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#if showStatus}
					<StatusBadge variant={statusVariant} text={capitalizeFirstLetter(item.status)} />
				{/if}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="flex flex-wrap gap-x-4 gap-y-3">
				{#if showServiceCount}
					<div class="flex min-w-0 flex-1 basis-[160px] items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<LayersIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.services()}</div>
							<div class="mt-0.5 text-xs font-medium">
								{serviceCount}
								{Number(serviceCount) === 1 ? 'service' : 'services'}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			{#if showServiceCount}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.services()}:</span>
					<span class="text-muted-foreground text-[11px] leading-tight">
						{serviceCount}
					</span>
				</div>
			{/if}
			{#if showCreatedAt && item.createdAt}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_created()}:</span>
					<span class="text-muted-foreground truncate text-[11px] leading-tight">
						{format(new Date(item.createdAt), 'PP')}
					</span>
				</div>
			{/if}
		{/if}
	</Card.Content>
	{#if !compact && showCreatedAt && item.createdAt}
		<Card.Footer class="flex items-center gap-2 border-t-1 py-3">
			<ClockIcon class="text-muted-foreground size-3.5" />
			<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_created()}</span>
			<span class="text-muted-foreground ml-auto font-mono text-[11px]">
				{format(new Date(item.createdAt), 'PP p')}
			</span>
		</Card.Footer>
	{/if}
</Card.Root>
