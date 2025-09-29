<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import TagIcon from '@lucide/svelte/icons/tag';
	import PortBadge from '$lib/components/port-badge.svelte';
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
	<div class="space-y-16">
		{#if hasEnvVars}
			<div class="space-y-6">
				<div class="space-y-4">
					<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
						<div class="bg-primary/10 rounded-lg p-2.5">
							<SettingsIcon class="text-primary size-6" />
						</div>
						{m.containers_env_vars_title()}
					</h2>
					<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">Runtime environment variables for your container</p>
				</div>

				{#if container.config?.env && container.config.env.length > 0}
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
						{#each container.config.env as env, index (index)}
							{#if env.includes('=')}
								{@const [key, ...valueParts] = env.split('=')}
								{@const value = valueParts.join('=')}
								<Card.Root>
									<Card.Content class="p-4">
										<div class="space-y-2.5">
											<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{key}</div>
											<div
												class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
											>
												<div
													class="text-foreground font-mono text-sm leading-relaxed font-medium break-all select-all"
													title="Click to select"
												>
													{value}
												</div>
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{:else}
								<Card.Root>
									<Card.Content class="p-4">
										<div class="space-y-2.5">
											<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">ENVIRONMENT VARIABLE</div>
											<div
												class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
											>
												<div
													class="text-foreground font-mono text-sm leading-relaxed font-medium break-all select-all"
													title="Click to select"
												>
													{env}
												</div>
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
						<div class="text-sm">{m.containers_no_env_vars()}</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if hasPorts}
			<div class="space-y-8">
				<div class="space-y-4">
					<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
						<div class="bg-primary/10 rounded-lg p-2.5">
							<NetworkIcon class="text-primary size-6" />
						</div>
						{m.containers_port_mappings()}
					</h2>
					<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">
						Network ports exposed by this container for external access
					</p>
				</div>
				<Card.Root>
					<Card.Content class="p-5">
						<PortBadge ports={container.ports ?? []} {baseServerUrl} />
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		{#if hasLabels}
			<div class="space-y-8">
				<div class="space-y-4">
					<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
						<div class="bg-primary/10 rounded-lg p-2.5">
							<TagIcon class="text-primary size-6" />
						</div>
						{m.common_labels()}
					</h2>
					<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">
						Metadata labels attached to this container for organization and automation
					</p>
				</div>

				{#if container.labels && Object.keys(container.labels).length > 0}
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
						{#each Object.entries(container.labels) as [key, value] (key)}
							<Card.Root>
								<Card.Content class="p-4">
									<div class="space-y-2.5">
										<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{key}</div>
										<div
											class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
										>
											<div
												class="text-foreground font-mono text-sm leading-relaxed font-medium break-all select-all"
												title="Click to select"
											>
												{value?.toString() || ''}
											</div>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{:else}
					<div class="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
						<div class="text-sm">{m.containers_no_labels_defined()}</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
