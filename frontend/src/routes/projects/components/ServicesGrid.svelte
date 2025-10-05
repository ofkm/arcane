<script lang="ts">
	import * as Card from '$lib/components/ui/card';
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

<Card.Root>
	<Card.Header icon={LayersIcon}>
		<div class="flex flex-col space-y-1.5">
			<Card.Title>
				<h2>
					{m.compose_services()}
				</h2>
			</Card.Title>
			<Card.Description>{m.compose_services_description()}</Card.Description>
		</div>
	</Card.Header>
	<Card.Content class="p-4">
		{#if services && services.length > 0}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each services as service (service.container_id || service.name)}
					{@const status = service.status || 'unknown'}
					{@const variant = getStatusVariant(status)}

					{#if service.container_id}
						<a href={`/containers/${service.container_id}`} class="group">
							<Card.Root
								variant="subtle"
								class="group-hover:border-border/60 group-hover:bg-muted/50 flex h-full cursor-pointer transition-all duration-200"
							>
								<Card.Content class="flex flex-col p-4">
									<div class="flex items-start gap-3">
										<div class="rounded-lg bg-blue-500/10 p-2 transition-colors group-hover:bg-blue-500/15">
											<LayersIcon class="size-5 text-blue-500" />
										</div>
										<div class="min-w-0 flex-1">
											<h3 class="text-foreground mb-2 text-base font-semibold transition-colors">
												{service.name}
											</h3>
											<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
											<p class="text-muted-foreground mt-2 text-xs">{m.compose_active_container()}</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						</a>
					{:else}
						<Card.Root variant="subtle" class="flex h-full opacity-60">
							<Card.Content class="flex flex-col p-4">
								<div class="flex items-start gap-3">
									<div class="rounded-lg bg-amber-500/10 p-2">
										<LayersIcon class="size-5 text-amber-500" />
									</div>
									<div class="min-w-0 flex-1">
										<h3 class="text-foreground mb-2 text-base font-semibold">
											{service.name}
										</h3>
										<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
										<p class="text-muted-foreground mt-2 text-xs">
											{m.compose_service_not_created()}
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed py-12 text-center">
				<div class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
					<LayersIcon class="text-muted-foreground size-6" />
				</div>
				<div class="text-muted-foreground text-sm">{m.compose_no_services_found()}</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
