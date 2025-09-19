<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { m } from '$lib/paraglide/messages';

	type Service = {
		container_id?: string;
		name: string;
		status?: string;
	};

	let { services }: { services?: Service[] } = $props();
</script>

{#if services && services.length > 0}
	<div class="bg-card rounded-lg border">
		<div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each services as service (service.container_id || service.name)}
				{@const status = service.status || 'unknown'}
				{@const variant = getStatusVariant(status)}

				{#if service.container_id}
					<a
						href={`/containers/${service.container_id}`}
						class="bg-background hover:bg-muted/50 group flex items-center gap-3 rounded-lg border p-3 transition-all"
					>
						<div class="bg-primary/10 rounded-full p-2">
							<LayersIcon class="text-primary size-3" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between">
								<p class="truncate text-sm font-medium" title={service.name}>{service.name}</p>
							</div>
							<div class="mt-1 flex items-center gap-2">
								<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="text-xs" />
							</div>
						</div>
					</a>
				{:else}
					<div class="bg-muted/10 flex items-center gap-3 rounded-lg border p-3">
						<div class="bg-muted/50 rounded-full p-2">
							<LayersIcon class="text-muted-foreground size-3" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium" title={service.name}>{service.name}</p>
							<div class="mt-1 flex items-center gap-2">
								<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="text-xs" />
								<span class="text-muted-foreground text-xs">{m.compose_service_not_created()}</span>
							</div>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{:else}
	<div class="py-12 text-center">
		<div class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
			<LayersIcon class="text-muted-foreground size-6" />
		</div>
		<div class="text-muted-foreground">{m.compose_no_services_found()}</div>
	</div>
{/if}
