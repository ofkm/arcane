<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import TagIcon from '@lucide/svelte/icons/tag';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import HashIcon from '@lucide/svelte/icons/hash';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { format } from 'date-fns';
	import bytes from 'bytes';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { toast } from 'svelte-sonner';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { environmentAPI } from '$lib/services/api';

	let { data } = $props();
	let { image } = $derived(data);

	let isLoading = $state({
		pulling: false,
		removing: false,
		refreshing: false
	});

	const shortId = $derived(image?.id?.split(':')[1]?.substring(0, 12) || 'N/A');

	const createdDate = $derived(() => {
		if (!image?.created) {
			return 'N/A';
		}
		try {
			const date = new Date(image.created);
			if (isNaN(date.getTime())) {
				return 'N/A';
			}
			return format(date, 'PP p');
		} catch {
			return 'N/A';
		}
	});

	const imageSize = $derived(bytes.format(image?.size || 0));
	const architecture = $derived(image?.architecture || 'N/A');
	const osName = $derived(image?.os || 'N/A');

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
				<h1 class="break-all text-2xl font-bold tracking-tight">
					{image?.repoTags?.[0] || shortId}
				</h1>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<ArcaneButton
				action="remove"
				onclick={() => handleImageRemove(image.id)}
				loading={isLoading.removing}
				disabled={isLoading.removing}
				size="sm"
			/>
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
								<HashIcon class="size-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">ID</p>
								<p class="mt-1 truncate text-base font-semibold" title={image.id}>{shortId}</p>
							</div>
						</div>

						<!-- Size -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2">
								<HardDriveIcon class="size-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Size</p>
								<p class="mt-1 text-base font-semibold">{imageSize}</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2">
								<ClockIcon class="size-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Created</p>
								<p class="mt-1 text-base font-semibold">{createdDate()}</p>
							</div>
						</div>

						<!-- Architecture -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 p-2">
								<CpuIcon class="size-5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Architecture</p>
								<p class="mt-1 text-base font-semibold">{architecture}</p>
							</div>
						</div>

						<!-- OS -->
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 p-2">
								<LayersIcon class="size-5 text-indigo-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">OS</p>
								<p class="mt-1 text-base font-semibold">{osName}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Tags Card -->
			{#if image.repoTags && image.repoTags.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-2"><TagIcon class="text-muted-foreground size-5" /> Tags</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-2">
							{#each image.repoTags as tag (tag)}
								<Badge variant="secondary">{tag}</Badge>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Environment Variables Card -->
			{#if image.config?.env && image.config.env.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Environment Variables</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each image.config.env as env (env)}
							{@const [key, ...valueParts] = env.split('=')}
							{@const value = valueParts.join('=')}
							<div class="flex flex-col text-sm sm:flex-row sm:items-center">
								<span class="text-muted-foreground w-full break-all font-medium sm:w-1/4">{key}:</span>
								<span class="w-full break-all font-mono text-xs sm:w-3/4 sm:text-sm">{value}</span>
							</div>
							{#if env !== image.config.env[image.config.env.length - 1]}
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
			<ArcaneButton action="cancel" customLabel="Back to Images" onclick={() => goto('/images')} size="sm" class="mt-4" />
		</div>
	{/if}
</div>
