<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, HardDrive, Clock, Tag, Layers, Hash, Trash2, Loader2, Cpu } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatDate } from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ImageAPIService from '$lib/services/api/image-api-service';
	import { toast } from 'svelte-sonner';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	let { data }: { data: PageData } = $props();
	let { image } = $derived(data);
	const imageApi = new ImageAPIService();

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
						result: await tryCatch(imageApi.remove(id)),
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
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
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

		<div class="flex gap-2 flex-wrap">
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
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						<!-- ID -->
						<div class="flex items-start gap-3">
							<div class="bg-gray-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Hash class="text-gray-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">ID</p>
								<p class="text-base font-semibold mt-1 truncate" title={image.Id}>{shortId}</p>
							</div>
						</div>

						<!-- Size -->
						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<HardDrive class="text-blue-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Size</p>
								<p class="text-base font-semibold mt-1">{imageSize}</p>
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

						<!-- Architecture -->
						<div class="flex items-start gap-3">
							<div class="bg-orange-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Cpu class="text-orange-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Architecture</p>
								<p class="text-base font-semibold mt-1">{image.Architecture || 'N/A'}</p>
							</div>
						</div>

						<!-- OS -->
						<div class="flex items-start gap-3">
							<div class="bg-indigo-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Layers class="text-indigo-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">OS</p>
								<p class="text-base font-semibold mt-1">{image.Os || 'N/A'}</p>
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
							<div class="text-sm flex flex-col sm:flex-row sm:items-center">
								<span class="font-medium text-muted-foreground w-full sm:w-1/4 break-all">{key}:</span>
								<span class="font-mono text-xs sm:text-sm break-all w-full sm:w-3/4">{value}</span>
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
		<div class="text-center py-12">
			<p class="text-lg font-medium text-muted-foreground">Image not found.</p>
			<ArcaneButton action="cancel" customLabel="Back to Images" onClick={() => goto('/images')} size="sm" class="mt-4" />
		</div>
	{/if}
</div>
