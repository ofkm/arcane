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
	<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
		<DatabaseIcon class="size-5" />
		{m.containers_storage_title()}
	</h2>

	<Card.Root class="rounded-lg border shadow-sm">
		<Card.Content class="p-6">
			{#if container.mounts && container.mounts.length > 0}
				<div class="space-y-4">
					{#each container.mounts as mount (mount.destination)}
						<div class="overflow-hidden rounded border">
							<div class="bg-muted/20 flex items-center justify-between p-4">
								<div class="flex items-center gap-3">
									<div
										class="rounded p-2 {mount.type === 'volume'
											? 'bg-purple-100 dark:bg-purple-950'
											: mount.type === 'bind'
												? 'bg-blue-100 dark:bg-blue-950'
												: 'bg-amber-100 dark:bg-amber-950'}"
									>
										{#if mount.type === 'volume'}
											<DatabaseIcon class="size-4 text-purple-600" />
										{:else if mount.type === 'bind'}
											<HardDriveIcon class="size-4 text-blue-600" />
										{:else}
											<TerminalIcon class="size-4 text-amber-600" />
										{/if}
									</div>
									<div>
										<div class="font-medium">
											{mount.type === 'tmpfs'
												? m.containers_mount_type_tmpfs()
												: mount.type === 'volume'
													? mount.name || m.containers_mount_type_volume()
													: m.containers_mount_type_bind()}
										</div>
										<div class="text-muted-foreground text-sm">
											{mount.type} mount {mount.rw ? `(${m.common_rw()})` : `(${m.common_ro()})`}
										</div>
									</div>
								</div>
								<Badge variant={mount.rw ? 'outline' : 'secondary'}>
									{mount.rw ? m.common_rw() : m.common_ro()}
								</Badge>
							</div>
							<div class="space-y-3 p-4">
								<div class="flex">
									<span class="text-muted-foreground w-24 font-medium">{m.containers_mount_label_container()}</span>
									<span class="bg-muted/50 flex-1 rounded px-2 py-1 font-mono">{mount.destination}</span>
								</div>
								<div class="flex">
									<span class="text-muted-foreground w-24 font-medium">
										{mount.type === 'volume'
											? m.containers_mount_label_volume()
											: mount.type === 'bind'
												? m.containers_mount_label_host()
												: m.containers_mount_label_source()}
									</span>
									<span class="bg-muted/50 flex-1 rounded px-2 py-1 font-mono">{mount.source}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-12 text-center">
					<div class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
						<DatabaseIcon class="text-muted-foreground size-6" />
					</div>
					<div class="text-muted-foreground">{m.containers_no_mounts_configured()}</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
