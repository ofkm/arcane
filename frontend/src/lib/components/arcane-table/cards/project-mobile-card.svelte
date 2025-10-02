<script lang="ts">
	import { ArcaneCard, ArcaneCardHeader, ArcaneCardContent } from '$lib/components/arcane-card';
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
		showServices = true,
		showStatus = true,
		showUpdated = true,
		onclick
	}: {
		item: Project;
		rowActions?: Snippet<[{ item: Project }]>;
		compact?: boolean;
		class?: string;
		showServices?: boolean;
		showStatus?: boolean;
		showUpdated?: boolean;
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
	const serviceCount = $derived(item.services?.length || 0);
</script>

<ArcaneCard class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<ArcaneCardHeader icon={FolderIcon} {iconVariant} {compact} enableHover={!!onclick}>
		<div class="flex min-w-0 flex-1 items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.name}>
					{compact ? truncateString(item.name, 25) : item.name}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5 truncate', compact ? 'text-[10px]' : 'text-xs')}>
					{item.id}
				</p>
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
	</ArcaneCardHeader>

	{#if !compact}
		<ArcaneCardContent class="flex flex-1 flex-col p-3.5">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showServices}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<LayersIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.services()}</div>
							<div class="mt-0.5 text-xs font-medium">
								{serviceCount}
								{serviceCount === 1 ? 'service' : 'services'}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if showUpdated && item.updatedAt}
				<div class="border-muted/40 mt-3 flex items-center gap-2 border-t pt-3">
					<ClockIcon class="text-muted-foreground size-3.5" />
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.updated()}</span>
					<span class="text-muted-foreground ml-auto text-[11px]">
						{format(new Date(item.updatedAt), 'PP p')}
					</span>
				</div>
			{/if}
		</ArcaneCardContent>
	{:else}
		<ArcaneCardContent class="flex flex-1 flex-col space-y-1.5 p-2">
			{#if showServices}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.services()}:</span>
					<span class="text-muted-foreground text-[11px] leading-tight">
						{serviceCount}
					</span>
				</div>
			{/if}
			{#if showUpdated && item.updatedAt}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.updated()}:</span>
					<span class="text-muted-foreground truncate text-[11px] leading-tight">
						{format(new Date(item.updatedAt), 'PP')}
					</span>
				</div>
			{/if}
		</ArcaneCardContent>
	{/if}
</ArcaneCard>
