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

<section class="scroll-mt-20">
	<div class="space-y-8">
		<div class="space-y-4">
			<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
				<div class="bg-primary/10 rounded-lg p-2.5">
					<InfoIcon class="text-primary size-6" />
				</div>
				Container Details
			</h2>
			<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">Essential information about this container instance</p>
		</div>

		<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
			<Card.Root>
				<Card.Content class="p-5">
					<div class="flex items-start gap-4">
						<div class="rounded-lg bg-blue-500/10 p-2.5">
							<HardDriveIcon class="size-5 text-blue-500" />
						</div>
						<div class="min-w-0 flex-1 space-y-2.5">
							<div class="text-foreground text-sm font-semibold">{m.common_image()}</div>
							<div class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors">
								<div class="text-foreground font-mono text-sm font-medium break-all select-all" title="Click to select">
									{container.image || m.common_na()}
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-5">
					<div class="flex items-start gap-4">
						<div class="rounded-lg bg-green-500/10 p-2.5">
							<ClockIcon class="size-5 text-green-500" />
						</div>
						<div class="min-w-0 flex-1 space-y-2.5">
							<div class="text-foreground text-sm font-semibold">{m.common_created()}</div>
							<div class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors">
								<div class="text-foreground text-sm font-medium select-all" title="Click to select">
									{formatDockerDate(container?.created)}
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-5">
					<div class="flex items-start gap-4">
						<div class="rounded-lg bg-purple-500/10 p-2.5">
							<NetworkIcon class="size-5 text-purple-500" />
						</div>
						<div class="min-w-0 flex-1 space-y-2.5">
							<div class="text-foreground text-sm font-semibold">{m.containers_ip_address()}</div>
							<div class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors">
								<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
									{primaryIpAddress}
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

		<Card.Root>
			<Card.Content class="p-5">
				<div class="flex items-start gap-4">
					<div class="rounded-lg bg-amber-500/10 p-2.5">
						<TerminalIcon class="size-5 text-amber-500" />
					</div>
						<div class="min-w-0 flex-1 space-y-2.5">
							<div class="text-foreground text-sm font-semibold">{m.containers_command()}</div>
							<div class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors">
								<div
									class="text-foreground font-mono text-sm leading-relaxed font-medium break-all select-all"
									title="Click to select"
								>
									{container.config?.cmd?.join(' ') || m.common_na()}
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="mt-16 space-y-8">
			<div class="space-y-4">
				<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
					<div class="bg-primary/10 rounded-lg p-2.5">
						<CpuIcon class="text-primary size-6" />
					</div>
					System Information
				</h2>
				<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">Technical details and runtime configuration</p>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<Card.Root>
					<Card.Content class="p-4">
						<div class="space-y-2.5">
							<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{m.common_id()}</div>
							<div class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors">
								<div class="text-foreground font-mono text-sm font-medium break-all select-all" title="Click to select">
									{container.id}
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				{#if container.config?.workingDir}
					<div class="bg-card rounded-lg border p-4">
						<div class="space-y-2.5">
							<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
								{m.containers_working_directory()}
							</div>
							<div class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors">
								<div class="text-foreground font-mono text-sm font-medium break-all select-all" title="Click to select">
									{container.config.workingDir}
								</div>
							</div>
						</div>
					</div>
				{/if}

				{#if container.config?.user}
					<Card.Root>
						<Card.Content class="p-4">
							<div class="space-y-2.5">
								<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{m.common_user()}</div>
								<div class="group bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-md border px-3 py-2 transition-colors">
									<div class="text-foreground font-mono text-sm font-medium select-all" title="Click to select">
										{container.config.user}
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				{#if container.state?.health}
					<Card.Root class="lg:col-span-2">
						<Card.Content class="p-4">
							<div class="space-y-3">
								<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
									{m.containers_health_label()}
								</div>
								<div class="flex flex-wrap items-center gap-4">
									<StatusBadge
										variant={container.state.health.status === 'healthy'
											? 'green'
											: container.state.health.status === 'unhealthy'
												? 'red'
												: 'amber'}
										text={container.state.health.status}
									/>
									{#if container.state.health.log && container.state.health.log.length > 0}
										{@const first = container.state.health.log[0]}
										{@const lastCheck = (first?.Start ?? first?.start) as string | undefined}
										{#if lastCheck}
											<span class="text-muted-foreground text-sm font-medium">
												{m.containers_health_last_check({ time: formatDockerDate(lastCheck) })}
											</span>
										{/if}
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</div>
</section>
