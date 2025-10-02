<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import TagIcon from '@lucide/svelte/icons/tag';
	import { PortBadge } from '$lib/components/badges';
	import { ArcaneCard, ArcaneCardHeader } from '$lib/components/arcane-card';
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

<div class="space-y-6">
	{#if hasEnvVars}
		<ArcaneCard>
			<ArcaneCardHeader icon={SettingsIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>{m.containers_env_vars_title()}</Card.Title>
					<Card.Description>{m.containers_env_vars_description()}</Card.Description>
				</div>
			</ArcaneCardHeader>
			<Card.Content class="p-4">
				{#if container.config?.env && container.config.env.length > 0}
					<div class="space-y-3">
						{#each container.config.env as env, index (index)}
							{#if env.includes('=')}
								{@const [key, ...valueParts] = env.split('=')}
								{@const value = valueParts.join('=')}
								<div class="border-border flex items-start justify-between border-b py-2 last:border-b-0">
									<div class="text-muted-foreground text-sm font-medium break-all">{key}</div>
									<div class="text-foreground ml-4 cursor-pointer font-mono text-sm break-all select-all" title="Click to select">
										{value}
									</div>
								</div>
							{:else}
								<div class="border-border flex items-start justify-between border-b py-2 last:border-b-0">
									<div class="text-muted-foreground text-sm font-medium">ENV_VAR</div>
									<div class="text-foreground ml-4 cursor-pointer font-mono text-sm break-all select-all" title="Click to select">
										{env}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
						<div class="text-sm">{m.containers_no_env_vars()}</div>
					</div>
				{/if}
			</Card.Content>
		</ArcaneCard>
	{/if}

	{#if hasPorts}
		<ArcaneCard>
			<ArcaneCardHeader icon={NetworkIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>{m.containers_port_mappings()}</Card.Title>
					<Card.Description>{m.containers_port_mappings_description()}</Card.Description>
				</div>
			</ArcaneCardHeader>
			<Card.Content class="p-4">
				<PortBadge ports={container.ports ?? []} {baseServerUrl} />
			</Card.Content>
		</ArcaneCard>
	{/if}

	{#if hasLabels}
		<ArcaneCard>
			<ArcaneCardHeader icon={TagIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>{m.common_labels()}</Card.Title>
					<Card.Description>{m.common_labels_description()}</Card.Description>
				</div>
			</ArcaneCardHeader>
			<Card.Content class="p-4">
				{#if container.labels && Object.keys(container.labels).length > 0}
					<div class="space-y-3">
						{#each Object.entries(container.labels) as [key, value] (key)}
							<div class="border-border flex items-start justify-between border-b py-2 last:border-b-0">
								<div class="text-muted-foreground text-sm font-medium break-all">{key}</div>
								<div class="text-foreground ml-4 cursor-pointer font-mono text-sm break-all select-all" title="Click to select">
									{value?.toString() || ''}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
						<div class="text-sm">{m.containers_no_labels_defined()}</div>
					</div>
				{/if}
			</Card.Content>
		</ArcaneCard>
	{/if}
</div>
