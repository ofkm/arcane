<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, HardDrive, Clock, Tag, Layers, Trash2, Loader2, Database, Globe, Info } from '@lucide/svelte';
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
			message += '\n\n⚠️ Warning: This volume is currently in use by containers. Forcing removal may cause data loss or container issues.';
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

		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
			<div class="flex flex-col">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight">
						{volume?.Name || 'Volume Details'}
					</h1>
				</div>

				<!-- Status badges in a row -->
				<div class="flex gap-2 mt-2">
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
				<ArcaneButton action="remove" customLabel="Remove Volume" onClick={() => handleRemoveVolumeConfirm(volume?.Name)} loading={isLoading.remove} disabled={isLoading.remove} />
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
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
						<!-- Name -->
						<div class="flex items-start gap-3">
							<div class="bg-gray-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Database class="text-gray-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Name</p>
								<p class="text-base font-semibold mt-1 break-words">{volume.Name}</p>
							</div>
						</div>

						<!-- Driver -->
						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<HardDrive class="text-blue-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Driver</p>
								<p class="text-base font-semibold mt-1">{volume.Driver}</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Clock class="text-green-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Created</p>
								<p class="text-base font-semibold mt-1">{createdDate}</p>
							</div>
						</div>

						<!-- Scope -->
						<div class="flex items-start gap-3">
							<div class="bg-purple-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Globe class="text-purple-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Scope</p>
								<p class="text-base font-semibold mt-1 capitalize">{volume.Scope}</p>
							</div>
						</div>

						<!-- In Use -->
						<div class="flex items-start gap-3">
							<div class="bg-amber-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Info class="text-amber-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Status</p>
								<p class="text-base font-semibold mt-1">
									{#if inUse}
										<StatusBadge variant="green" text="In Use" />
									{:else}
										<StatusBadge variant="amber" text="Unused" />
									{/if}
								</p>
							</div>
						</div>

						<!-- Mountpoint - Full width -->
						<div class="flex items-start gap-3 col-span-1 sm:col-span-2 lg:col-span-3">
							<div class="bg-teal-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Layers class="text-teal-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Mountpoint</p>
								<div class="mt-2 bg-muted/50 p-3 rounded-lg border">
									<code class="text-sm font-mono break-all">{volume.Mountpoint}</code>
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
						<div class="bg-card rounded-lg border divide-y">
							{#each Object.entries(volume.Labels) as [key, value] (key)}
								<div class="p-3 flex flex-col sm:flex-row">
									<div class="font-medium text-muted-foreground w-full sm:w-1/3 break-all mb-2 sm:mb-0">
										{key}
									</div>
									<div class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3 bg-muted/50 p-2 rounded">
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
						<div class="bg-card rounded-lg border divide-y">
							{#each Object.entries(volume.Options) as [key, value] (key)}
								<div class="p-3 flex flex-col sm:flex-row">
									<div class="font-medium text-muted-foreground w-full sm:w-1/3 break-all mb-2 sm:mb-0">
										{key}
									</div>
									<div class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3 bg-muted/50 p-2 rounded">
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
				<Card.Root class="border shadow-sm bg-muted/10">
					<Card.Content class="pt-6 pb-6 text-center">
						<div class="flex flex-col items-center justify-center">
							<div class="bg-muted/30 rounded-full p-3 mb-4">
								<Tag class="text-muted-foreground opacity-50 size-5" />
							</div>
							<p class="text-muted-foreground">This volume has no additional labels or driver options.</p>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<!-- Volume Not Found with improved styling -->
		<div class="flex flex-col items-center justify-center py-16 px-4 text-center">
			<div class="bg-muted/30 rounded-full p-4 mb-4">
				<Database class="text-muted-foreground size-10 opacity-70" />
			</div>
			<h2 class="text-xl font-medium mb-2">Volume Not Found</h2>
			<p class="text-muted-foreground mb-6">The requested volume could not be found or is no longer available.</p>

			<ArcaneButton action="cancel" customLabel="Back to Volumes" onClick={() => goto('/volumes')} size="sm" />
		</div>
	{/if}
</div>
