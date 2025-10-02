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
			<Card.Title>{m.compose_services()}</Card.Title>
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
								class="group-hover:border-border/60 flex h-full cursor-pointer flex-col gap-6 py-3 transition-all duration-200 group-hover:shadow-sm"
							>
								<Card.Content class="p-6 px-6 py-2">
									<div class="flex items-start gap-4">
										<div class="rounded-lg bg-blue-500/10 p-2.5 transition-colors group-hover:bg-blue-500/15">
											<LayersIcon class="size-5 text-blue-500" />
										</div>
										<div class="min-w-0 flex-1">
											<h3 class="text-foreground text-lg font-semibold transition-colors">
												{service.name}
											</h3>
											<div class="mt-3 flex items-center gap-2">
												<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
											</div>
											<p class="text-muted-foreground mt-2 text-sm">{m.compose_active_container()}</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						</a>
					{:else}
						<Card.Root class="flex h-full flex-col gap-6 py-3 opacity-75">
							<Card.Content class="p-6 px-6 py-2">
								<div class="flex items-start gap-4">
									<div class="rounded-lg bg-amber-500/10 p-2.5">
										<LayersIcon class="size-5 text-amber-500" />
									</div>
									<div class="min-w-0 flex-1">
										<h3 class="text-foreground text-lg font-semibold">
											{service.name}
										</h3>
										<div class="mt-3 flex items-center gap-2">
											<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
										</div>
										<p class="text-muted-foreground mt-2 text-sm">
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
