<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import { m } from '$lib/paraglide/messages';
	import type { ContainerDetailsDto } from '$lib/types/container.type';

	interface Props {
		container: ContainerDetailsDto;
	}

	let { container }: Props = $props();
</script>

<section class="scroll-mt-20">
	<div class="space-y-8">
		<div class="space-y-4">
			<h2 class="text-foreground flex items-center gap-3 text-2xl font-bold tracking-tight">
				<div class="bg-primary/10 rounded-lg p-2.5">
					<DatabaseIcon class="text-primary size-6" />
				</div>
				{m.containers_storage_title()}
			</h2>
			<p class="text-muted-foreground max-w-2xl text-sm leading-relaxed">
				Volume mounts and storage configuration for persistent data
			</p>
		</div>
		{#if container.mounts && container.mounts.length > 0}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{#each container.mounts as mount (mount.destination)}
					<Card.Root class="pt-0">
						<div class="bg-muted/30 flex items-center justify-between p-5">
							<div class="flex min-w-0 flex-1 items-center gap-4">
								<div
									class="flex-shrink-0 rounded-lg p-3 {mount.type === 'volume'
										? 'bg-purple-100 dark:bg-purple-950/30'
										: mount.type === 'bind'
											? 'bg-blue-100 dark:bg-blue-950/30'
											: 'bg-amber-100 dark:bg-amber-950/30'}"
								>
									{#if mount.type === 'volume'}
										<DatabaseIcon class="size-5 text-purple-600" />
									{:else if mount.type === 'bind'}
										<HardDriveIcon class="size-5 text-blue-600" />
									{:else}
										<TerminalIcon class="size-5 text-amber-600" />
									{/if}
								</div>
								<div class="min-w-0 flex-1 space-y-1">
									<div class="text-base font-bold break-all">
										{mount.type === 'tmpfs'
											? m.containers_mount_type_tmpfs()
											: mount.type === 'volume'
												? mount.name || m.containers_mount_type_volume()
												: m.containers_mount_type_bind()}
									</div>
									<div class="text-muted-foreground text-sm font-medium">
										{mount.type} mount {mount.rw ? `(${m.common_rw()})` : `(${m.common_ro()})`}
									</div>
								</div>
							</div>
							<Badge variant={mount.rw ? 'outline' : 'secondary'} class="ml-3 flex-shrink-0 text-sm font-semibold">
								{mount.rw ? m.common_rw() : m.common_ro()}
							</Badge>
						</div>
						<Card.Content class="space-y-4 p-5">
							<div class="space-y-2.5">
								<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
									{m.containers_mount_label_container()}
								</div>
								<div
									class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
								>
									<div
										class="text-foreground overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{mount.destination}
									</div>
								</div>
							</div>
							<div class="space-y-2.5">
								<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
									{mount.type === 'volume'
										? m.containers_mount_label_volume()
										: mount.type === 'bind'
											? m.containers_mount_label_host()
											: m.containers_mount_label_source()}
								</div>
								<div
									class="group bg-background/30 hover:bg-muted/60 cursor-pointer rounded-md border px-3 py-2 transition-colors"
								>
									<div
										class="text-foreground overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{mount.source}
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed py-12 text-center">
				<div class="bg-muted/30 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
					<DatabaseIcon class="text-muted-foreground size-6" />
				</div>
				<div class="text-muted-foreground text-sm">{m.containers_no_mounts_configured()}</div>
			</div>
		{/if}
	</div>
</section>
