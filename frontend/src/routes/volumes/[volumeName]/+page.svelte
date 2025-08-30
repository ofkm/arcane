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
	import { environmentAPI } from '$lib/services/api';
	import { format } from 'date-fns';

	let { data } = $props();
	let volume = $state(data.volume);

	let isLoading = $state({ remove: false });
	const createdDate = $derived(volume.createdAt ? format(new Date(volume.createdAt), 'PP p') : 'N/A');

	async function handleRemoveVolumeConfirm(volumeName: string) {
		let message = 'Are you sure you want to delete this volume? This action cannot be undone.';

		if (volume.inUse) {
			message +=
				'\n\n⚠️ Warning: This volume is currently in use by containers. Forcing removal may cause data loss or container issues.';
		}

		openConfirmDialog({
			title: 'Delete Volume',
			message,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteVolume(volumeName)),
						message: 'Failed to Remove Volume',
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success('Volume Removed Successfully.');
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
					<Breadcrumb.Link href="/volumes">Volumes</Breadcrumb.Link>
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
						<StatusBadge variant="green" text="In Use" />
					{:else}
						<StatusBadge variant="amber" text="Unused" />
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
					customLabel="Remove Volume"
					onclick={() => handleRemoveVolumeConfirm(volume.name)}
					loading={isLoading.remove}
					disabled={isLoading.remove}
				/>
			</div>
		</div>
	</div>

	{#if volume}
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-0">
					<Card.Title class="flex items-center gap-2 text-lg">
						<DatabaseIcon class="text-primary size-5" />
						Volume Details
					</Card.Title>
					<Card.Description>Basic information about this Docker volume</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6">
					<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-500/10 p-2">
								<DatabaseIcon class="size-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Name</p>
								<p class="mt-1 break-words text-base font-semibold">{volume.name}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2">
								<HardDriveIcon class="size-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Driver</p>
								<p class="mt-1 text-base font-semibold">{volume.driver}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2">
								<ClockIcon class="size-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Created</p>
								<p class="mt-1 text-base font-semibold">{createdDate}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 p-2">
								<GlobeIcon class="size-5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Scope</p>
								<p class="mt-1 text-base font-semibold capitalize">{volume.scope}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 p-2">
								<InfoIcon class="size-5 text-amber-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Status</p>
								<p class="mt-1 text-base font-semibold">
									{#if volume.inUse}
										<StatusBadge variant="green" text="In Use" />
									{:else}
										<StatusBadge variant="amber" text="Unused" />
									{/if}
								</p>
							</div>
						</div>

						<div class="col-span-1 flex items-start gap-3 sm:col-span-2 lg:col-span-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-500/10 p-2">
								<LayersIcon class="size-5 text-teal-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Mountpoint</p>
								<div class="bg-muted/50 mt-2 rounded-lg border p-3">
									<code class="break-all font-mono text-sm">{volume.mountpoint}</code>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-0">
					<Card.Title class="flex items-center gap-2 text-lg">
						<HardDriveIcon class="text-primary size-5" />
						Containers Using This Volume
					</Card.Title>
					<Card.Description>List of containers currently referencing this volume</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6">
					{#if volume.containers && volume.containers.length > 0}
						<div class="divide-y rounded-lg border">
							{#each volume.containers as id (id)}
								<div class="flex items-center justify-between gap-3 p-3">
									<code class="break-all font-mono text-sm">{truncateString(id, 48)}</code>
									<a href={`/containers/${id}`} class="text-primary text-sm hover:underline" title="View container details">
										View
									</a>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-muted-foreground">No containers are currently using this volume.</div>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if volume.labels && Object.keys(volume.labels).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<TagIcon class="text-primary size-5" />
							Labels
						</Card.Title>
						<Card.Description>User-defined metadata attached to this volume</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(volume.labels) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div class="text-muted-foreground mb-2 w-full break-all font-medium sm:mb-0 sm:w-1/3">
										{key}
									</div>
									<div class="bg-muted/50 w-full break-all rounded p-2 font-mono text-xs sm:w-2/3 sm:text-sm">
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if volume.options && Object.keys(volume.options).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<HardDriveIcon class="text-primary size-5" />
							Driver Options
						</Card.Title>
						<Card.Description>Volume driver-specific options</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(volume.options) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div class="text-muted-foreground mb-2 w-full break-all font-medium sm:mb-0 sm:w-1/3">
										{key}
									</div>
									<div class="bg-muted/50 w-full break-all rounded p-2 font-mono text-xs sm:w-2/3 sm:text-sm">
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
							<p class="text-muted-foreground">This volume has no additional labels or driver options.</p>
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
			<h2 class="mb-2 text-xl font-medium">Volume Not Found</h2>
			<p class="text-muted-foreground mb-6">The requested volume could not be found or is no longer available.</p>

			<ArcaneButton action="cancel" customLabel="Back to Volumes" onclick={() => goto('/volumes')} size="sm" />
		</div>
	{/if}
</div>
