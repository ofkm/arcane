<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import PortBadges from '$lib/components/port-badges.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { ContainerDetailsDto } from '$lib/types/container.type';

	interface Props {
		container: ContainerDetailsDto;
		hasEnvVars: boolean;
		hasPorts: boolean;
		hasLabels: boolean;
		baseServerUrl: string;
	}

	let { container, hasEnvVars, hasPorts, hasLabels, baseServerUrl }: Props = $props();
</script>

<section class="scroll-mt-20">
	<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
		<SettingsIcon class="size-5" />
		{m.containers_configuration_title()}
	</h2>

	<Card.Root class="rounded-lg border shadow-sm">
		<Card.Header class="pb-4">
			<Card.Title>{m.containers_env_ports_labels_title()}</Card.Title>
			<Card.Description class="text-muted-foreground text-sm">
				{m.containers_env_ports_labels_description()}
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-8">
			{#if hasEnvVars}
				<div>
					<h3 class="mb-3 text-sm font-semibold tracking-tight">{m.containers_env_vars_title()}</h3>

					{#if container.config?.env && container.config.env.length > 0}
						<ul class="divide-border/60 divide-y">
							{#each container.config.env as env, index (index)}
								{#if env.includes('=')}
									{@const [key, ...valueParts] = env.split('=')}
									{@const value = valueParts.join('=')}
									<li class="px-4 py-2.5">
										<div class="flex min-w-0 items-center gap-3">
											<Badge variant="secondary">
												{key}:
											</Badge>
											<span class="truncate font-semibold" title={value}>{value}</span>
										</div>
									</li>
								{:else}
									<li class="px-4 py-2.5">
										<div class="flex min-w-0 items-center gap-3">
											<Badge variant="secondary">ENV:</Badge>
											<span class="truncate font-semibold" title={env}>{env}</span>
										</div>
									</li>
								{/if}
							{/each}
						</ul>
					{:else}
						<div class="text-muted-foreground py-8 text-center">{m.containers_no_env_vars()}</div>
					{/if}
				</div>
			{/if}

			{#if hasEnvVars && (hasPorts || hasLabels)}
				<Separator />
			{/if}

			{#if hasPorts}
				<div>
					<h3 class="mb-3 text-sm font-semibold tracking-tight">{m.containers_port_mappings()}</h3>
					<PortBadges ports={container.ports ?? []} {baseServerUrl} />
				</div>
			{/if}

			{#if hasPorts && hasLabels}
				<Separator />
			{/if}

			{#if hasLabels}
				<div>
					<h3 class="mb-3 text-sm font-semibold tracking-tight">{m.common_labels()}</h3>

					{#if container.labels && Object.keys(container.labels).length > 0}
						<ul class="divide-border/60 divide-y">
							{#each Object.entries(container.labels) as [key, value] (key)}
								<li class="px-4 py-2.5">
									<div class="flex min-w-0 items-center gap-3">
										<Badge variant="secondary">
											{key}:
										</Badge>
										<span class="truncate font-semibold" title={value?.toString()}>
											{value?.toString() || ''}
										</span>
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="text-muted-foreground py-8 text-center">{m.containers_no_labels_defined()}</div>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
