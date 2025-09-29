<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import TagIcon from '@lucide/svelte/icons/tag';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import InfoIcon from '@lucide/svelte/icons/info';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { goto } from '$app/navigation';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { truncateString } from '$lib/utils/string.utils';
	import { openConfirmDialog } from '$lib/components/confirm-dialog/';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { format } from 'date-fns';
	import ContainerIcon from '@lucide/svelte/icons/container';
	import { m } from '$lib/paraglide/messages';
	import { volumeService } from '$lib/services/volume-service.js';

	let { data } = $props();
	let volume = $state(data.volume);
	let containersDetailed = $state<{ id: string; name: string }[]>(data.containersDetailed ?? []);

	let isLoading = $state({ remove: false });
	const createdDate = $derived(volume.createdAt ? format(new Date(volume.createdAt), 'PP p') : m.common_unknown());

	async function handleRemoveVolumeConfirm(volumeName: string) {
		const safeName = volumeName?.trim() || m.common_unknown();
		let message = m.volumes_remove_confirm_message({ name: safeName });
		if (volume.inUse) {
			message += `\n\n${m.volumes_remove_in_use_warning()}`;
		}

		openConfirmDialog({
			title: m.volumes_remove_title(),
			message,
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(volumeService.deleteVolume(safeName)),
						message: m.volumes_remove_failed({ name: safeName }),
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(m.volumes_remove_success({ name: safeName }));
							goto('/volumes');
						}
					});
				}
			}
		});
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col space-y-4">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/volumes">{m.volumes_title()}</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{volume.name}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
			<div class="flex flex-col">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight">
						{volume.name}
					</h1>
				</div>

				<div class="mt-2 flex gap-2">
					{#if volume.inUse}
						<StatusBadge variant="green" text={m.common_in_use()} />
					{:else}
						<StatusBadge variant="amber" text={m.common_unused()} />
					{/if}

					{#if volume.driver}
						<StatusBadge variant="blue" text={volume.driver} />
					{/if}

					{#if volume.scope}
						<StatusBadge variant="purple" text={volume.scope} />
					{/if}
				</div>
			</div>

			<div class="flex gap-2 self-start">
				<ArcaneButton
					action="remove"
					customLabel={m.volumes_remove_title()}
					onclick={() => handleRemoveVolumeConfirm(volume.name)}
					loading={isLoading.remove}
					disabled={isLoading.remove}
				/>
			</div>
		</div>
	</div>

	{#if volume}
		<div class="space-y-6">
			<Card.Root class="pt-0">
				<Card.Header class="bg-muted rounded-t-xl p-4">
					<Card.Title class="flex items-center gap-2 text-lg">
						<InfoIcon class="text-primary size-5" />
						{m.volumes_details_title()}
					</Card.Title>
					<Card.Description>{m.volumes_details_description()}</Card.Description>
				</Card.Header>
				<Card.Content class="p-4">
					<div class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-500/10 p-2">
								<DatabaseIcon class="size-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">{m.common_name()}</p>
								<p class="mt-1 cursor-pointer text-sm font-semibold break-all select-all sm:text-base" title="Click to select">{volume.name}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2">
								<HardDriveIcon class="size-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">{m.common_driver()}</p>
								<p class="mt-1 cursor-pointer text-sm font-semibold select-all sm:text-base" title="Click to select">{volume.driver}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2">
								<ClockIcon class="size-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">{m.common_created()}</p>
								<p class="mt-1 cursor-pointer text-sm font-semibold select-all sm:text-base" title="Click to select">{createdDate}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 p-2">
								<GlobeIcon class="size-5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">{m.common_scope()}</p>
								<p class="mt-1 cursor-pointer text-sm font-semibold capitalize select-all sm:text-base" title="Click to select">{volume.scope}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 p-2">
								<InfoIcon class="size-5 text-amber-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">{m.common_status()}</p>
								<p class="mt-1 text-base font-semibold">
									{#if volume.inUse}
										<StatusBadge variant="green" text={m.common_in_use()} />
									{:else}
										<StatusBadge variant="amber" text={m.common_unused()} />
									{/if}
								</p>
							</div>
						</div>

						<div class="col-span-1 flex items-start gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-6">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-500/10 p-2">
								<LayersIcon class="size-5 text-teal-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">{m.common_mountpoint()}</p>
								<div class="bg-muted/50 mt-2 rounded-lg border p-3 cursor-pointer select-all" title="Click to select">
									<code class="break-all font-mono text-sm">{volume.mountpoint}</code>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="pt-0">
				<Card.Header class="bg-muted rounded-t-xl p-4">
					<Card.Title class="flex items-center gap-2 text-lg">
						<ContainerIcon class="text-primary size-5" />
						{m.volumes_containers_using_title()}
					</Card.Title>
					<Card.Description>{m.volumes_containers_using_description()}</Card.Description>
				</Card.Header>
				<Card.Content class="p-4">
					{#if containersDetailed.length > 0}
						<div class="bg-card divide-y rounded-lg border">
							{#each containersDetailed as c (c.id)}
								<div class="flex flex-col p-3 sm:flex-row sm:items-center">
									<div class="mb-2 w-full break-all font-medium sm:mb-0 sm:w-1/3">
										<a href="/containers/{c.id}" class="text-primary flex items-center hover:underline">
											<ContainerIcon class="text-muted-foreground mr-1.5 size-3.5" />
											{c.name}
										</a>
									</div>
									<div class="w-full pl-0 sm:w-2/3 sm:pl-4">
										<code class="bg-muted text-muted-foreground break-all rounded px-1.5 py-0.5 font-mono text-xs sm:text-sm cursor-pointer select-all" title="Click to select">
											{truncateString(c.id, 48)}
										</code>
									</div>
								</div>
							{/each}
						</div>
					{:else if volume.containers && volume.containers.length > 0}
						<!-- Fallback to IDs if names not resolved -->
						<div class="divide-y rounded-lg border">
							{#each volume.containers as id (id)}
								<div class="flex items-center justify-between gap-3 p-3">
									<code class="break-all font-mono text-sm">{truncateString(id, 48)}</code>
									<a href={`/containers/${id}`} class="text-primary text-sm hover:underline">{m.common_view()}</a>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-muted-foreground">{m.volumes_no_containers_using()}</div>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if volume.labels && Object.keys(volume.labels).length > 0}
				<Card.Root class="pt-0">
					<Card.Header class="bg-muted rounded-t-xl p-4">
						<Card.Title class="flex items-center gap-2 text-lg">
							<TagIcon class="text-primary size-5" />
							{m.common_labels()}
						</Card.Title>
						<Card.Description>{m.volumes_labels_description()}</Card.Description>
					</Card.Header>
					<Card.Content class="p-4">
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(volume.labels) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div class="text-muted-foreground mb-2 w-full break-all font-medium sm:mb-0 sm:w-1/3">
										{key}
									</div>
									<div class="bg-muted/50 w-full break-all rounded p-2 font-mono text-xs sm:w-2/3 sm:text-sm cursor-pointer select-all" title="Click to select">
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if volume.options && Object.keys(volume.options).length > 0}
				<Card.Root class="pt-0">
					<Card.Header class="bg-muted rounded-t-xl p-4">
						<Card.Title class="flex items-center gap-2 text-lg">
							<HardDriveIcon class="text-primary size-5" />
							{m.common_driver_options()}
						</Card.Title>
						<Card.Description>{m.volumes_driver_options_description()}</Card.Description>
					</Card.Header>
					<Card.Content class="p-4">
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(volume.options) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div class="text-muted-foreground mb-2 w-full break-all font-medium sm:mb-0 sm:w-1/3">
										{key}
									</div>
									<div class="bg-muted/50 w-full break-all rounded p-2 font-mono text-xs sm:w-2/3 sm:text-sm cursor-pointer select-all" title="Click to select">
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if (!volume.labels || Object.keys(volume.labels).length === 0) && (!volume.options || Object.keys(volume.options).length === 0)}
				<Card.Root class="bg-muted/10 border shadow-sm">
					<Card.Content class="pb-6 pt-6 text-center">
						<div class="flex flex-col items-center justify-center">
							<div class="bg-muted/30 mb-4 rounded-full p-3">
								<TagIcon class="text-muted-foreground size-5 opacity-50" />
							</div>
							<p class="text-muted-foreground">{m.volumes_no_labels_or_options()}</p>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
			<div class="bg-muted/30 mb-4 rounded-full p-4">
				<DatabaseIcon class="text-muted-foreground size-10 opacity-70" />
			</div>
			<h2 class="mb-2 text-xl font-medium">{m.volumes_not_found_title()}</h2>
			<p class="text-muted-foreground mb-6">{m.volumes_not_found_description()}</p>

			<ArcaneButton action="cancel" customLabel={m.common_back_to_volumes()} onclick={() => goto('/volumes')} size="sm" />
		</div>
	{/if}
</div>
