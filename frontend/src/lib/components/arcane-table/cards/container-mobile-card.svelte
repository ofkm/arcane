<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { PortBadge } from '$lib/components/badges/index.js';
	import { format } from 'date-fns';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ImageIcon from '@lucide/svelte/icons/image';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showCreated = true,
		showImage = true,
		showMounts = true,
		showNetwork = true,
		showPorts = true,
		showRestartPolicy = true,
		showStatus = true,
		baseServerUrl = '',
		onclick
	}: {
		item: ContainerSummaryDto;
		rowActions?: Snippet<[{ item: ContainerSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showCreated?: boolean;
		showImage?: boolean;
		showMounts?: boolean;
		showNetwork?: boolean;
		showPorts?: boolean;
		showRestartPolicy?: boolean;
		showStatus?: boolean;
		baseServerUrl?: string;
		onclick?: (item: ContainerSummaryDto) => void;
	} = $props();

	function getContainerName(item: ContainerSummaryDto): string {
		if (item.names && item.names.length > 0) {
			return item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0];
		}
		return item.id.substring(0, 12);
	}

	function getStatusVariant(state: string): 'green' | 'red' | 'amber' {
		return state === 'running' ? 'green' : state === 'exited' ? 'red' : 'amber';
	}

	function getIconVariant(state: string): 'emerald' | 'red' | 'amber' {
		return state === 'running' ? 'emerald' : state === 'exited' ? 'red' : 'amber';
	}

	const containerName = $derived(getContainerName(item));
	const statusVariant = $derived(getStatusVariant(item.state));
	const iconVariant = $derived(getIconVariant(item.state));
	const networkNames = $derived(item.networkSettings?.networks ? Object.keys(item.networkSettings.networks) : []);
	const mountCount = $derived(item.mounts?.length ?? 0);
	const restartPolicy = $derived(item.hostConfig?.restartPolicy ?? 'no');
</script>

<Card.Root class={className} onclick={onclick ? () => onclick(item) : undefined}>
	{#snippet children()}
		<Card.Header icon={BoxIcon} {iconVariant} {compact} enableHover={!!onclick}>
			{#snippet children()}
				<div class="min-w-0 flex-1">
					<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-[13px]' : 'text-base')}>
						{containerName}
					</h3>
					<div class="text-muted-foreground mt-0.5 flex items-center gap-2">
						<span class={cn('truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
							{String(item.id).substring(0, 12)}
						</span>
					</div>
				</div>

				<div class="flex flex-shrink-0 items-center gap-2">
					<StatusBadge variant={statusVariant} text={capitalizeFirstLetter(item.state)} size="sm" />
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			{/snippet}
		</Card.Header>

		{#if !compact}
			<Card.Content class="flex flex-1 flex-col p-3.5">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#if showImage}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
								<ImageIcon class="size-3.5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
									{m.common_image()}
								</div>
								<div class="mt-0.5 truncate font-mono text-xs font-medium">
									{item.image}
								</div>
							</div>
						</div>
					{/if}

					{#if showStatus && item.status}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
								<ClockIcon class="size-3.5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
									{m.common_status()}
								</div>
								<div class="mt-0.5 text-xs font-medium">
									{item.status}
								</div>
							</div>
						</div>
					{/if}

					{#if showNetwork && networkNames.length > 0}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
								<NetworkIcon class="size-3.5 text-cyan-500" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Network</div>
								<div class="mt-0.5 flex flex-wrap gap-1">
									{#each networkNames.slice(0, 2) as network}
										<span
											class="inline-flex items-center rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 ring-1 ring-cyan-500/20 ring-inset dark:text-cyan-300 dark:ring-cyan-500/30"
										>
											{network}
										</span>
									{/each}
									{#if networkNames.length > 2}
										<span class="text-muted-foreground inline-flex items-center text-[10px] font-medium">
											+{networkNames.length - 2}
										</span>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					{#if showMounts && mountCount > 0}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
								<HardDriveIcon class="size-3.5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Mounts</div>
								<div class="mt-0.5 text-xs font-medium">
									{mountCount}
									{mountCount === 1 ? 'mount' : 'mounts'}
								</div>
							</div>
						</div>
					{/if}

					{#if showRestartPolicy && restartPolicy && restartPolicy !== 'no'}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
								<RefreshCwIcon class="size-3.5 text-indigo-500" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Restart Policy</div>
								<div class="mt-0.5 text-xs font-medium">
									{capitalizeFirstLetter(restartPolicy)}
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if showPorts && item.ports && item.ports.length > 0}
					<div class="mt-3 flex items-start gap-2.5">
						<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
							<NetworkIcon class="size-3.5 text-sky-500" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.ports()}
							</div>
							<div class="mt-1">
								<PortBadge ports={item.ports} {baseServerUrl} />
							</div>
						</div>
					</div>
				{/if}

				{#if showCreated && item.created}
					<div class="border-muted/40 mt-3 flex items-center gap-2 border-t pt-3">
						<ClockIcon class="text-muted-foreground size-3.5" />
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
							{m.common_created()}
						</span>
						<span class="text-muted-foreground ml-auto font-mono text-[11px]">
							{format(new Date(item.created * 1000), 'PP p')}
						</span>
					</div>
				{/if}
			</Card.Content>
		{:else}
			<Card.Content class="flex flex-1 flex-col space-y-1.5 p-2">
				{#if showImage}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_image()}:</span>
						<span class="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px] leading-tight">
							{item.image}
						</span>
					</div>
				{/if}
				{#if showStatus && item.status}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_status()}:</span>
						<span class="text-muted-foreground truncate text-[11px] leading-tight">
							{item.status}
						</span>
					</div>
				{/if}
				{#if showNetwork && networkNames.length > 0}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.network_interface()}:</span>
						<span class="text-muted-foreground truncate text-[11px] leading-tight">
							{networkNames.join(', ')}
						</span>
					</div>
				{/if}
				{#if showMounts && mountCount > 0}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase"
							>{m.containers_storage_title()}:</span
						>
						<span class="text-muted-foreground text-[11px] leading-tight">
							{mountCount}
							{mountCount === 1 ? 'mount' : 'mounts'}
						</span>
					</div>
				{/if}
				{#if showRestartPolicy && restartPolicy && restartPolicy !== 'no'}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.restart_policy_label()}:</span>
						<span class="text-muted-foreground text-[11px] leading-tight">
							{capitalizeFirstLetter(restartPolicy)}
						</span>
					</div>
				{/if}
				{#if showPorts && item.ports && item.ports.length > 0}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.ports()}:</span>
						<div class="min-w-0 flex-1">
							<PortBadge ports={item.ports} {baseServerUrl} />
						</div>
					</div>
				{/if}
				{#if showCreated && item.created}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_created()}:</span>
						<span class="text-muted-foreground font-mono text-[11px] leading-tight">
							{format(new Date(item.created * 1000), 'PP')}
						</span>
					</div>
				{/if}
			</Card.Content>
		{/if}
	{/snippet}
</Card.Root>
