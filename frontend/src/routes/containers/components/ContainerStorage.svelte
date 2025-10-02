<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
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

<div class="space-y-6">
	<Card.Root>
		<Card.Header icon={DatabaseIcon}>
			<div class="flex flex-col space-y-1.5">
				<Card.Title>
					<h2>
						{m.containers_storage_title()}
					</h2>
				</Card.Title>
				<Card.Description>{m.containers_storage_description()}</Card.Description>
			</div>
		</Card.Header>
		<Card.Content class="p-4">
			{#if container.mounts && container.mounts.length > 0}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
					{#each container.mounts as mount (mount.destination)}
						<Card.Root class="flex flex-col gap-6 py-3 pt-0">
							<Card.Header
								class="bg-muted/30 @container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 rounded-t-xl p-4 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6"
							>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div
											class="rounded-lg p-2.5 {mount.type === 'volume'
												? 'bg-purple-500/10'
												: mount.type === 'bind'
													? 'bg-blue-500/10'
													: 'bg-amber-500/10'}"
										>
											{#if mount.type === 'volume'}
												<DatabaseIcon class="size-5 text-purple-500" />
											{:else if mount.type === 'bind'}
												<HardDriveIcon class="size-5 text-blue-500" />
											{:else}
												<TerminalIcon class="size-5 text-amber-500" />
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<Card.Title class="text-base break-all">
												{mount.type === 'tmpfs'
													? m.containers_mount_type_tmpfs()
													: mount.type === 'volume'
														? mount.name || m.containers_mount_type_volume()
														: m.containers_mount_type_bind()}
											</Card.Title>
											<Card.Description class="text-xs">
												{mount.type} mount
											</Card.Description>
										</div>
									</div>
									<Badge variant={mount.rw ? 'outline' : 'secondary'} class="text-xs font-semibold">
										{mount.rw ? m.common_rw() : m.common_ro()}
									</Badge>
								</div>
							</Card.Header>
							<Card.Content class="space-y-4 px-6 pt-0">
								<div class="space-y-2">
									<div class="text-muted-foreground text-xs font-semibold uppercase">
										{m.containers_mount_label_container()}
									</div>
									<div
										class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{mount.destination}
									</div>
								</div>
								<div class="space-y-2">
									<div class="text-muted-foreground text-xs font-semibold uppercase">
										{mount.type === 'volume'
											? m.containers_mount_label_volume()
											: mount.type === 'bind'
												? m.containers_mount_label_host()
												: m.containers_mount_label_source()}
									</div>
									<div
										class="text-foreground cursor-pointer overflow-hidden font-mono text-sm font-medium break-all select-all"
										title="Click to select"
									>
										{mount.source}
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
		</Card.Content>
	</Card.Root>
</div>
