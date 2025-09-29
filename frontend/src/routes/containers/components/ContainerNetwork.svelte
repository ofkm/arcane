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

<div class="space-y-6">
	<Card.Root class="pt-0">
		<Card.Header class="bg-muted rounded-t-xl p-4">
			<Card.Title class="flex items-center gap-2 text-lg">
				<NetworkIcon class="text-primary size-5" />
				<h2>
					{m.containers_networks_title()}
				</h2>
			</Card.Title>
			<Card.Description>{m.containers_networks_description()}</Card.Description>
		</Card.Header>
		<Card.Content class="p-4">
			{#if container.networkSettings?.networks && Object.keys(container.networkSettings.networks).length > 0}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
					{#each Object.entries(container.networkSettings.networks) as [networkName, rawNetworkConfig] (networkName)}
						{@const networkConfig = ensureNetworkConfig({
							IPAddress: rawNetworkConfig.ipAddress,
							IPPrefixLen: rawNetworkConfig.ipPrefixLen,
							Gateway: rawNetworkConfig.gateway,
							MacAddress: rawNetworkConfig.macAddress,
							Aliases: rawNetworkConfig.aliases
						})}
						<Card.Root class="pt-0">
							<Card.Header class="bg-muted/30 rounded-t-xl p-4">
								<div class="flex items-center gap-3">
									<div class="rounded-lg bg-blue-500/10 p-2.5">
										<NetworkIcon class="size-5 text-blue-500" />
									</div>
									<div class="min-w-0 flex-1">
										<Card.Title class="text-base break-all">
											{networkName}
										</Card.Title>
										<Card.Description class="text-xs">{m.network_interface()}</Card.Description>
									</div>
								</div>
							</Card.Header>
							<Card.Content class="space-y-4 pt-0">
								<div class="space-y-2">
									<div class="text-muted-foreground text-xs font-semibold uppercase">
										{m.containers_ip_address()}
									</div>
									<div
										class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{rawNetworkConfig.ipAddress || m.common_na()}
									</div>
								</div>
								<div class="space-y-2">
									<div class="text-muted-foreground text-xs font-semibold uppercase">{m.containers_gateway()}</div>
									<div
										class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{rawNetworkConfig.gateway || m.common_na()}
									</div>
								</div>
								<div class="space-y-2">
									<div class="text-muted-foreground text-xs font-semibold uppercase">
										{m.containers_mac_address()}
									</div>
									<div
										class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{rawNetworkConfig.macAddress || m.common_na()}
									</div>
								</div>
								<div class="space-y-2">
									<div class="text-muted-foreground text-xs font-semibold uppercase">{m.containers_subnet()}</div>
									<div
										class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{rawNetworkConfig.ipPrefixLen
											? `${rawNetworkConfig.ipAddress}/${rawNetworkConfig.ipPrefixLen}`
											: m.common_na()}
									</div>
								</div>
								{#if rawNetworkConfig.aliases && rawNetworkConfig.aliases.length > 0}
									<div class="space-y-2">
										<div class="text-muted-foreground text-xs font-semibold uppercase">
											{m.containers_aliases()}
										</div>
										<div
											class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
											title="Click to select"
										>
											{rawNetworkConfig.aliases.join(', ')}
										</div>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<div class="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
					<div class="text-sm">{m.containers_no_networks_connected()}</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
