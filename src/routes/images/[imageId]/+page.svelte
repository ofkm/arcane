<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, RefreshCw, HardDrive, Clock, Tag, Layers, Hash, Trash2, Loader2, Cpu } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatDate, formatBytes } from '$lib/utils';
	import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog-old.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let { image } = $derived(data);

	let isRefreshing = $state(false);
	let isRemoving = $state(false);
	let showRemoveConfirm = $state(false);
	let forceRemove = $state(false); // State for the force remove checkbox

	// Helper to format the image ID
	const shortId = $derived(image?.Id.split(':')[1].substring(0, 12) || 'N/A');
	const createdDate = $derived(image?.Created ? formatDate(image.Created) : 'N/A');
	const imageSize = $derived(formatBytes(image?.Size || 0));

	// Determine if the image is potentially in use (basic check, more robust check might be needed)
	// A more reliable check would involve fetching containers using this image ID in the load function
	const potentiallyInUse = $derived(false); // Placeholder - Needs data from load function

	async function refreshData() {
		isRefreshing = true;
		await invalidateAll();
		setTimeout(() => {
			isRefreshing = false;
		}, 500);
	}

	function triggerRemove() {
		forceRemove = false; // Reset force state when opening dialog
		showRemoveConfirm = true;
	}

	// This function is called by the ConfirmDialog
	function handleRemoveConfirm(forceConfirm: boolean) {
		forceRemove = forceConfirm; // Set the force state based on checkbox
		// Find the form and submit it
		const removeForm = document.getElementById('remove-image-form') as HTMLFormElement;
		if (removeForm) {
			// Optionally add force parameter to form action or hidden input if needed by server action
			// Since we read from URL in server action, just submit
			removeForm.submit();
		}
	}
</script>

<!-- Confirmation Dialog for Remove -->
<ConfirmDialog bind:open={showRemoveConfirm} title="Confirm Image Removal" description={`Are you sure you want to remove image ${shortId}? This action cannot be undone.`} confirmLabel="Remove" variant="destructive" onConfirm={handleRemoveConfirm} itemType={'image'} isRunning={potentiallyInUse} />

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
				<!-- Add badges for tags if needed -->
			</div>
		</div>

		<div class="flex gap-2 flex-wrap">
			<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
				<RefreshCw class={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
			</Button>
			<!-- Remove Button triggers dialog -->
			<Button variant="destructive" size="sm" onclick={triggerRemove} disabled={isRemoving}>
				{#if isRemoving}
					<Loader2 class="h-4 w-4 mr-2 animate-spin" />
				{:else}
					<Trash2 class="h-4 w-4 mr-2" />
				{/if} Remove
			</Button>
			<!-- Hidden form for removal action -->
			<form
				id="remove-image-form"
				method="POST"
				action="?/remove{forceRemove ? '&force=true' : ''}"
				use:enhance={() => {
					isRemoving = true;
					return async ({ update }) => {
						await update({ reset: false });
						// isRemoving will be reset by effect or on navigation
					};
				}}
				class="hidden"
			>
				<input type="hidden" name="imageId" value={image?.Id} />
				<button type="submit">Submit</button>
			</form>
		</div>
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Action Failed</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if image}
		<!-- Image Details Section -->
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Image Details</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						<!-- ID -->
						<div class="flex items-start gap-3">
							<div class="bg-gray-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Hash class="h-5 w-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">ID</p>
								<p class="text-base font-semibold mt-1 truncate" title={image.Id}>{shortId}</p>
							</div>
						</div>

						<!-- Size -->
						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<HardDrive class="h-5 w-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Size</p>
								<p class="text-base font-semibold mt-1">{imageSize}</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div class="bg-green-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Clock class="h-5 w-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Created</p>
								<p class="text-base font-semibold mt-1">{createdDate}</p>
							</div>
						</div>

						<!-- Architecture -->
						<div class="flex items-start gap-3">
							<div class="bg-orange-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Cpu class="h-5 w-5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Architecture</p>
								<p class="text-base font-semibold mt-1">{image.Architecture || 'N/A'}</p>
							</div>
						</div>

						<!-- OS -->
						<div class="flex items-start gap-3">
							<div class="bg-indigo-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Layers class="h-5 w-5 text-indigo-500" />
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
						<Card.Title class="flex items-center gap-2"><Tag class="h-5 w-5 text-muted-foreground" /> Tags</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-2">
							{#each image.RepoTags as tag}
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
						{#each Object.entries(image.Config.Labels) as [key, value]}
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

			<!-- Layers/History (Optional - can be large) -->
			<!-- {#if image.RootFS?.Layers}
            <Card.Root>
                <Card.Header><Card.Title>Layers</Card.Title></Card.Header>
                <Card.Content>...</Card.Content>
            </Card.Root>
            {/if} -->
		</div>
	{:else}
		<!-- Image Not Found Section -->
		<div class="text-center py-12">
			<p class="text-lg font-medium text-muted-foreground">Image not found.</p>
			<Button href="/images" variant="outline" size="sm" class="mt-4">
				<ArrowLeft class="h-4 w-4 mr-2" /> Back to Images
			</Button>
		</div>
	{/if}
</div>
