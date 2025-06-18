<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { HardDrive, Clock, Tag, Layers, Hash, Cpu } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatDate } from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { toast } from 'svelte-sonner';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { environmentAPI } from '$lib/services/api';

	let { data }: { data: PageData } = $props();
	let { image } = $derived(data);

	let isLoading = $state({
		pulling: false,
		removing: false,
		refreshing: false
	});

	const shortId = $derived(image?.Id.split(':')[1].substring(0, 12) || 'N/A');
	const createdDate = $derived(image?.Created ? formatDate(image.Created) : 'N/A');
	const imageSize = $derived(formatBytes(image?.Size || 0));

	async function handleImageRemove(id: string) {
		openConfirmDialog({
			title: 'Delete Image',
			message: `Are you sure you want to delete this image? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					await handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteImage(id)),
						message: 'Failed to Remove Image',
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success('Image Removed Successfully.');
							goto('/images');
						}
					});
				}
			}
		});
	}
</script>

<div class="space-y-6 pb-8">
	<!-- Breadcrumb Navigation -->
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/images">Images</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{shortId}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			<div class="mt-2 flex items-center gap-2">
				<h1 class="text-2xl font-bold tracking-tight break-all">
					{image?.RepoTags?.[0] || shortId}
				</h1>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<ArcaneButton action="remove" onClick={() => handleImageRemove(image.Id)} loading={isLoading.removing} disabled={isLoading.removing} size="sm" />
		</div>
	</div>

	{#if image}
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Image Details</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						<!-- ID -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-500/10 p-2">
								<Hash class="size-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">ID</p>
								<p class="mt-1 truncate text-base font-semibold" title={image.Id}>{shortId}</p>
							</div>
						</div>

						<!-- Size -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2">
								<HardDrive class="size-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Size</p>
								<p class="mt-1 text-base font-semibold">{imageSize}</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2">
								<Clock class="size-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Created</p>
								<p class="mt-1 text-base font-semibold">{createdDate}</p>
							</div>
						</div>

						<!-- Architecture -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 p-2">
								<Cpu class="size-5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Architecture</p>
								<p class="mt-1 text-base font-semibold">{image.Architecture || 'N/A'}</p>
							</div>
						</div>

						<!-- OS -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 p-2">
								<Layers class="size-5 text-indigo-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">OS</p>
								<p class="mt-1 text-base font-semibold">{image.Os || 'N/A'}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Tags Card -->
			{#if image.RepoTags && image.RepoTags.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-2"><Tag class="text-muted-foreground size-5" /> Tags</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-2">
							{#each image.RepoTags as tag (tag)}
								<Badge variant="secondary">{tag}</Badge>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Labels Card -->
			{#if image.Config?.Labels && Object.keys(image.Config.Labels).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Labels</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each Object.entries(image.Config.Labels) as [key, value] (key)}
							<div class="flex flex-col text-sm sm:flex-row sm:items-center">
								<span class="text-muted-foreground w-full font-medium break-all sm:w-1/4">{key}:</span>
								<span class="w-full font-mono text-xs break-all sm:w-3/4 sm:text-sm">{value}</span>
							</div>
							{#if !Object.is(Object.keys(image.Config.Labels).length - 1, Object.keys(image.Config.Labels).indexOf(key))}
								<Separator class="my-2" />
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<div class="py-12 text-center">
			<p class="text-muted-foreground text-lg font-medium">Image not found.</p>
			<ArcaneButton action="cancel" customLabel="Back to Images" onClick={() => goto('/images')} size="sm" class="mt-4" />
		</div>
	{/if}
</div>
