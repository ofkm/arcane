<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import { m } from '$lib/paraglide/messages';
	import type { ContainerDetailsDto } from '$lib/types/container.type';

	interface NetworkConfig {
		IPAddress?: string;
		IPPrefixLen?: number;
		Gateway?: string;
		MacAddress?: string;
		Aliases?: string[];
		Links?: string[];
		[key: string]: any;
	}

	interface Props {
		container: ContainerDetailsDto;
	}

	let { container }: Props = $props();

	function ensureNetworkConfig(config: any): NetworkConfig {
		return config as NetworkConfig;
	}
</script>

<section class="scroll-mt-20">
	<div class="space-y-8">
		<div class="space-y-4">
			<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
				<div class="bg-primary/10 rounded-lg p-2.5">
					<NetworkIcon class="text-primary size-6" />
				</div>
				{m.containers_networks_title()}
			</h2>
			<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">
				Network interfaces and connectivity configuration for this container
			</p>
		</div>
		{#if container.networkSettings?.networks && Object.keys(container.networkSettings.networks).length > 0}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{#each Object.entries(container.networkSettings.networks) as [networkName, rawNetworkConfig] (networkName)}
					{@const networkConfig = ensureNetworkConfig({
						IPAddress: rawNetworkConfig.ipAddress,
						IPPrefixLen: rawNetworkConfig.ipPrefixLen,
						Gateway: rawNetworkConfig.gateway,
						MacAddress: rawNetworkConfig.macAddress,
						Aliases: rawNetworkConfig.aliases
					})}
				<Card.Root class="pt-0">
					<div class="bg-muted/30 flex items-center justify-between p-5">
						<div class="flex items-center gap-4">
							<div class="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30">
								<NetworkIcon class="size-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div class="space-y-1">
								<div class="text-base font-bold">{networkName}</div>
								<div class="text-muted-foreground text-sm font-medium">
									Network interface
								</div>
							</div>
						</div>
					</div>
					<Card.Content class="space-y-4 p-5">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div class="space-y-2.5">
									<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
										{m.containers_ip_address()}
									</div>
									<div
										class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
									>
										<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
											{rawNetworkConfig.ipAddress || m.common_na()}
										</div>
									</div>
								</div>
								<div class="space-y-2.5">
									<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{m.containers_gateway()}</div>
									<div
										class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
									>
										<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
											{rawNetworkConfig.gateway || m.common_na()}
										</div>
									</div>
								</div>
								<div class="space-y-2.5">
									<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
										{m.containers_mac_address()}
									</div>
									<div
										class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
									>
										<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
											{rawNetworkConfig.macAddress || m.common_na()}
										</div>
									</div>
								</div>
								<div class="space-y-2.5">
									<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{m.containers_subnet()}</div>
									<div
										class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
									>
										<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
											{rawNetworkConfig.ipPrefixLen
												? `${rawNetworkConfig.ipAddress}/${rawNetworkConfig.ipPrefixLen}`
												: m.common_na()}
										</div>
									</div>
								</div>
								{#if rawNetworkConfig.aliases && rawNetworkConfig.aliases.length > 0}
									<div class="col-span-full space-y-2.5">
										<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
											{m.containers_aliases()}
										</div>
										<div
											class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
										>
											<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
												{rawNetworkConfig.aliases.join(', ')}
											</div>
										</div>
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
				<div class="text-sm">{m.containers_no_networks_connected()}</div>
			</div>
		{/if}
	</div>
</section>
