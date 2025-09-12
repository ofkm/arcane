<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ProjectService } from '$lib/types/project.type';

	let { service }: { service: ProjectService } = $props();

	const status = $derived(service.status || 'unknown');
	const variant = $derived(getStatusVariant(status));
	const portCount = $derived(service.ports?.length ?? 0);
	const firstPort = $derived(
		portCount > 0
			? typeof service.ports?.[0] === 'string'
				? service.ports?.[0]
				: (service.ports?.[0] as any)?.PublicPort || (service.ports?.[0] as any)?.PrivatePort
			: null
	);

	const isLinked = $derived(!!service.container_id);
	const href = $derived(isLinked ? `/containers/${service.container_id}` : '#');
</script>

{#if isLinked}
	<a
		{href}
		class="bg-card/40 hover:bg-muted/60 group flex items-center gap-2 rounded-md border p-2 text-xs transition-colors"
		title={service.name}
	>
		<div class="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md">
			<LayersIcon class="text-primary size-3" />
		</div>
		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between gap-2">
				<p class="truncate font-medium">{service.name}</p>
				<ArrowRightIcon class="text-primary size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
			</div>
			<div class="mt-1 flex items-center gap-1.5">
				<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="px-1.5 py-0 text-[10px]" />
				{#if portCount > 0}
					<span class="bg-muted text-muted-foreground rounded px-1 py-0 text-[10px]">
						{portCount}{portCount > 1 ? ' ports' : ' port'}
						{#if firstPort}<span class="ml-1 text-[9px] opacity-70">({firstPort})</span>{/if}
					</span>
				{/if}
			</div>
		</div>
	</a>
{:else}
	<div class="bg-muted/20 flex items-center gap-2 rounded-md border border-dashed p-2 text-xs opacity-70" title={service.name}>
		<div class="bg-muted flex h-7 w-7 items-center justify-center rounded-md">
			<LayersIcon class="text-muted-foreground size-3" />
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate font-medium">{service.name}</p>
			<div class="mt-1 flex items-center gap-1.5">
				<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="px-1.5 py-0 text-[10px]" />
				<span class="text-muted-foreground text-[10px]">Not created</span>
			</div>
		</div>
	</div>
{/if}
