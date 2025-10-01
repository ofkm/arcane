<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import InfoIcon from '@lucide/svelte/icons/info';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { ContainerDetailsDto } from '$lib/types/container.type';
	import { format } from 'date-fns';

	interface Props {
		container: ContainerDetailsDto;
		primaryIpAddress: string;
	}

	let { container, primaryIpAddress }: Props = $props();

	function parseDockerDate(input: string | Date | undefined | null): Date | null {
		if (!input) return null;
		if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

		const s = String(input).trim();
		if (!s || s.startsWith('0001-01-01')) return null;

		const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?Z$/);
		let normalized = s;
		if (m) {
			const base = m[1];
			const frac = m[2] ? m[2].slice(1) : '';
			const ms = frac ? '.' + frac.slice(0, 3).padEnd(3, '0') : '';
			normalized = `${base}${ms}Z`;
		}

		const d = new Date(normalized);
		return isNaN(d.getTime()) ? null : d;
	}

	function formatDockerDate(input: string | Date | undefined | null, fmt = 'PP p'): string {
		const d = parseDockerDate(input);
		return d ? format(d, fmt) : 'N/A';
	}
</script>

<Card.Root class="pt-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<Card.Title class="flex items-center gap-2 text-lg">
			<InfoIcon class="text-primary size-5" />
			<h2>
				{m.containers_details_title()}
			</h2>
		</Card.Title>
		<Card.Description>{m.containers_details_description()}</Card.Description>
	</Card.Header>
	<Card.Content class="p-4">
		<div class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2">
					<HardDriveIcon class="size-5 text-blue-500" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-muted-foreground text-sm font-medium">{m.common_image()}</p>
					<p class="mt-1 cursor-pointer text-sm font-semibold break-all select-all sm:text-base" title="Click to select">
						{container.image || m.common_na()}
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2">
					<ClockIcon class="size-5 text-green-500" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-muted-foreground text-sm font-medium">{m.common_created()}</p>
					<p class="mt-1 cursor-pointer text-sm font-semibold select-all sm:text-base" title="Click to select">
						{formatDockerDate(container?.created)}
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 p-2">
					<NetworkIcon class="size-5 text-purple-500" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-muted-foreground text-sm font-medium">{m.containers_ip_address()}</p>
					<p class="mt-1 cursor-pointer font-mono text-sm font-semibold select-all sm:text-base" title="Click to select">
						{primaryIpAddress}
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-500/10 p-2">
					<CpuIcon class="size-5 text-gray-500" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-muted-foreground text-sm font-medium">{m.common_id()}</p>
					<p class="mt-1 cursor-pointer font-mono text-xs font-semibold break-all select-all sm:text-sm" title="Click to select">
						{container.id}
					</p>
				</div>
			</div>

			{#if container.config?.workingDir}
				<div class="flex items-start gap-3">
					<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 p-2">
						<InfoIcon class="size-5 text-indigo-500" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-muted-foreground text-sm font-medium">{m.containers_working_directory()}</p>
						<p
							class="mt-1 cursor-pointer font-mono text-xs font-semibold break-all select-all sm:text-sm"
							title="Click to select"
						>
							{container.config.workingDir}
						</p>
					</div>
				</div>
			{/if}

			{#if container.config?.user}
				<div class="flex items-start gap-3">
					<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 p-2">
						<InfoIcon class="size-5 text-orange-500" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-muted-foreground text-sm font-medium">User</p>
						<p class="mt-1 cursor-pointer font-mono text-sm font-semibold select-all" title="Click to select">
							{container.config.user}
						</p>
					</div>
				</div>
			{/if}

			{#if container.state?.health}
				<div class="flex items-start gap-3">
					<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500/10 p-2">
						<InfoIcon class="size-5 text-pink-500" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-muted-foreground text-sm font-medium">Health Status</p>
						<div class="mt-2">
							<StatusBadge
								variant={container.state.health.status === 'healthy'
									? 'green'
									: container.state.health.status === 'unhealthy'
										? 'red'
										: 'amber'}
								text={container.state.health.status}
								size="sm"
							/>
						</div>
					</div>
				</div>
			{/if}

			{#if container.config?.cmd && container.config.cmd.length > 0}
				<div class="col-span-1 flex items-start gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-6">
					<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 p-2">
						<TerminalIcon class="size-5 text-amber-500" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-muted-foreground text-sm font-medium">{m.containers_command()}</p>
						<p
							class="mt-1 cursor-pointer font-mono text-xs leading-relaxed font-medium break-all select-all sm:text-sm"
							title="Click to select"
						>
							{container.config.cmd.join(' ')}
						</p>
					</div>
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
