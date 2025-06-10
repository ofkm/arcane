<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		AlertCircle,
		HardDrive,
		Clock,
		Tag,
		Layers,
		Database,
		Globe,
		Info
	} from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { goto } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { formatDate } from '$lib/utils/string.utils';
	import { openConfirmDialog } from '$lib/components/confirm-dialog/';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import VolumeAPIService from '$lib/services/api/volume-api-service';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let { volume, inUse } = $derived(data);

	let isLoading = $state({ remove: false });
	const createdDate = $derived(volume?.CreatedAt ? formatDate(volume.CreatedAt) : 'N/A');

	const volumeApi = new VolumeAPIService();

	async function handleRemoveVolumeConfirm(volumeName: string) {
		let message = 'Are you sure you want to delete this volume? This action cannot be undone.';

		if (inUse) {
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
						result: await tryCatch(volumeApi.remove(volumeName)),
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
	<!-- Improved Header with Better Visual Hierarchy -->
	<div class="flex flex-col space-y-4">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/volumes">Volumes</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{volume?.Name || 'Details'}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
			<div class="flex flex-col">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight">
						{volume?.Name || 'Volume Details'}
					</h1>
				</div>

				<!-- Status badges in a row -->
				<div class="mt-2 flex gap-2">
					{#if inUse}
						<StatusBadge variant="green" text="In Use" />
					{:else}
						<StatusBadge variant="amber" text="Unused" />
					{/if}

					{#if volume?.Driver}
						<StatusBadge variant="blue" text={volume.Driver} />
					{/if}

					{#if volume?.Scope}
						<StatusBadge variant="purple" text={volume.Scope} />
					{/if}
				</div>
			</div>

			<!-- Action Buttons - Replace with ArcaneButton -->
			<div class="flex gap-2 self-start">
				<ArcaneButton
					action="remove"
					customLabel="Remove Volume"
					onClick={() => handleRemoveVolumeConfirm(volume?.Name)}
					loading={isLoading.remove}
					disabled={isLoading.remove}
				/>
			</div>
		</div>
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Action Failed</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if volume}
		<div class="space-y-6">
			<!-- Volume Details Card: Improved Layout -->
			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-0">
					<Card.Title class="flex items-center gap-2 text-lg">
						<Database class="text-primary size-5" />
						Volume Details
					</Card.Title>
					<Card.Description>Basic information about this Docker volume</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6">
					<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						<!-- Name -->
						<div class="flex items-start gap-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-500/10 p-2"
							>
								<Database class="size-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Name</p>
								<p class="mt-1 text-base font-semibold break-words">{volume.Name}</p>
							</div>
						</div>

						<!-- Driver -->
						<div class="flex items-start gap-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2"
							>
								<HardDrive class="size-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Driver</p>
								<p class="mt-1 text-base font-semibold">{volume.Driver}</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2"
							>
								<Clock class="size-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Created</p>
								<p class="mt-1 text-base font-semibold">{createdDate}</p>
							</div>
						</div>

						<!-- Scope -->
						<div class="flex items-start gap-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 p-2"
							>
								<Globe class="size-5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Scope</p>
								<p class="mt-1 text-base font-semibold capitalize">{volume.Scope}</p>
							</div>
						</div>

						<!-- In Use -->
						<div class="flex items-start gap-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 p-2"
							>
								<Info class="size-5 text-amber-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Status</p>
								<p class="mt-1 text-base font-semibold">
									{#if inUse}
										<StatusBadge variant="green" text="In Use" />
									{:else}
										<StatusBadge variant="amber" text="Unused" />
									{/if}
								</p>
							</div>
						</div>

						<!-- Mountpoint - Full width -->
						<div class="col-span-1 flex items-start gap-3 sm:col-span-2 lg:col-span-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-500/10 p-2"
							>
								<Layers class="size-5 text-teal-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Mountpoint</p>
								<div class="bg-muted/50 mt-2 rounded-lg border p-3">
									<code class="font-mono text-sm break-all">{volume.Mountpoint}</code>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Labels Card - Enhanced -->
			{#if volume.Labels && Object.keys(volume.Labels).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<Tag class="text-primary size-5" />
							Labels
						</Card.Title>
						<Card.Description>User-defined metadata attached to this volume</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(volume.Labels) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div
										class="text-muted-foreground mb-2 w-full font-medium break-all sm:mb-0 sm:w-1/3"
									>
										{key}
									</div>
									<div
										class="bg-muted/50 w-full rounded p-2 font-mono text-xs break-all sm:w-2/3 sm:text-sm"
									>
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Driver Options Card - Enhanced -->
			{#if volume.Options && Object.keys(volume.Options).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<HardDrive class="text-primary size-5" />
							Driver Options
						</Card.Title>
						<Card.Description>Volume driver-specific options</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(volume.Options) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div
										class="text-muted-foreground mb-2 w-full font-medium break-all sm:mb-0 sm:w-1/3"
									>
										{key}
									</div>
									<div
										class="bg-muted/50 w-full rounded p-2 font-mono text-xs break-all sm:w-2/3 sm:text-sm"
									>
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- If no labels or options, we can show this note -->
			{#if (!volume.Labels || Object.keys(volume.Labels).length === 0) && (!volume.Options || Object.keys(volume.Options).length === 0)}
				<Card.Root class="bg-muted/10 border shadow-sm">
					<Card.Content class="pt-6 pb-6 text-center">
						<div class="flex flex-col items-center justify-center">
							<div class="bg-muted/30 mb-4 rounded-full p-3">
								<Tag class="text-muted-foreground size-5 opacity-50" />
							</div>
							<p class="text-muted-foreground">
								This volume has no additional labels or driver options.
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<!-- Volume Not Found with improved styling -->
		<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
			<div class="bg-muted/30 mb-4 rounded-full p-4">
				<Database class="text-muted-foreground size-10 opacity-70" />
			</div>
			<h2 class="mb-2 text-xl font-medium">Volume Not Found</h2>
			<p class="text-muted-foreground mb-6">
				The requested volume could not be found or is no longer available.
			</p>

			<ArcaneButton
				action="cancel"
				customLabel="Back to Volumes"
				onClick={() => goto('/volumes')}
				size="sm"
			/>
		</div>
	{/if}
</div>
