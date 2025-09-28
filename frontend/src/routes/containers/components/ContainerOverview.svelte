<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import Separator from '$lib/components/ui/separator/separator.svelte';
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
	<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
		<HardDriveIcon class="size-5" />
		{m.containers_details_title()}
	</h2>

	<div class="mb-6">
		<Card.Root class="rounded-lg border shadow-sm">
			<Card.Header class="pb-4">
				<Card.Title>{m.containers_details_title()}</Card.Title>
				<Card.Description class="text-muted-foreground text-sm">
					{m.containers_details_description()}
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-6">
				<div class="space-y-4">
					<div class="flex items-center gap-3">
						<div class="rounded bg-blue-50 p-2 dark:bg-blue-950/20">
							<HardDriveIcon class="size-4 text-blue-600" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-sm">{m.common_image()}</div>
							<div class="truncate font-medium" title={container.image}>
								{container.image || m.common_na()}
							</div>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div class="rounded bg-green-50 p-2 dark:bg-green-950/20">
							<ClockIcon class="size-4 text-green-600" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-sm">{m.common_created()}</div>
							<div class="font-medium" title={formatDockerDate(container?.created)}>
								{formatDockerDate(container?.created)}
							</div>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div class="rounded bg-purple-50 p-2 dark:bg-purple-950/20">
							<NetworkIcon class="size-4 text-purple-600" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-sm">{m.containers_ip_address()}</div>
							<div class="font-medium">{primaryIpAddress}</div>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div class="rounded bg-amber-50 p-2 dark:bg-amber-950/20">
							<TerminalIcon class="size-4 text-amber-600" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-sm">{m.containers_command()}</div>
							<div class="truncate font-medium" title={container.config?.cmd?.join(' ')}>
								{container.config?.cmd?.join(' ') || m.common_na()}
							</div>
						</div>
					</div>
				</div>

				<Separator />

				<div class="space-y-3">
					<h4 class="text-sm font-semibold tracking-tight">{m.containers_system()}</h4>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="space-y-1">
							<div class="text-muted-foreground text-xs">{m.common_id()}</div>
							<div class="bg-muted/50 max-w-full truncate rounded px-2 py-1.5 font-mono text-xs">
								{container.id}
							</div>
						</div>

						{#if container.config?.workingDir}
							<div class="space-y-1">
								<div class="text-muted-foreground text-xs">{m.containers_working_directory()}</div>
								<div class="bg-muted/50 max-w-full truncate rounded px-2 py-1.5 font-mono text-xs">
									{container.config.workingDir}
								</div>
							</div>
						{/if}

						{#if container.config?.user}
							<div class="space-y-1">
								<div class="text-muted-foreground text-xs">{m.common_user()}</div>
								<div class="bg-muted/50 inline-flex rounded px-2 py-1.5 font-mono text-xs">
									{container.config.user}
								</div>
							</div>
						{/if}

						{#if container.state?.health}
							<div class="space-y-1 sm:col-span-2">
								<div class="text-muted-foreground text-xs">{m.containers_health_label()}</div>
								<div class="flex flex-wrap items-center gap-3">
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
											<span class="text-muted-foreground text-xs">
												{m.containers_health_last_check({ time: formatDockerDate(lastCheck) })}
											</span>
										{/if}
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>
