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
	<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
		<NetworkIcon class="size-5" />
		{m.containers_networks_title()}
	</h2>

	<Card.Root class="rounded-lg border shadow-sm">
		<Card.Content class="p-6">
			{#if container.networkSettings?.networks && Object.keys(container.networkSettings.networks).length > 0}
				<div class="space-y-6">
					{#each Object.entries(container.networkSettings.networks) as [networkName, rawNetworkConfig] (networkName)}
						{@const networkConfig = ensureNetworkConfig({
							IPAddress: rawNetworkConfig.ipAddress,
							IPPrefixLen: rawNetworkConfig.ipPrefixLen,
							Gateway: rawNetworkConfig.gateway,
							MacAddress: rawNetworkConfig.macAddress,
							Aliases: rawNetworkConfig.aliases
						})}
						<div class="rounded border p-4">
							<div class="mb-4 font-medium">{networkName}</div>
							<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
								<div>
									<div class="text-muted-foreground text-sm">{m.containers_ip_address()}</div>
									<div class="font-mono">{rawNetworkConfig.ipAddress || m.common_na()}</div>
								</div>
								<div>
									<div class="text-muted-foreground text-sm">{m.containers_gateway()}</div>
									<div class="font-mono">{rawNetworkConfig.gateway || m.common_na()}</div>
								</div>
								<div>
									<div class="text-muted-foreground text-sm">{m.containers_mac_address()}</div>
									<div class="font-mono">{rawNetworkConfig.macAddress || m.common_na()}</div>
								</div>
								<div>
									<div class="text-muted-foreground text-sm">{m.containers_subnet()}</div>
									<div class="font-mono">
										{rawNetworkConfig.ipPrefixLen
											? `${rawNetworkConfig.ipAddress}/${rawNetworkConfig.ipPrefixLen}`
											: m.common_na()}
									</div>
								</div>
								{#if rawNetworkConfig.aliases && rawNetworkConfig.aliases.length > 0}
									<div class="col-span-2">
										<div class="text-muted-foreground text-sm">{m.containers_aliases()}</div>
										<div class="font-mono">{rawNetworkConfig.aliases.join(', ')}</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-muted-foreground py-12 text-center">{m.containers_no_networks_connected()}</div>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
