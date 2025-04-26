<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/types/docker';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { columns } from './columns';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, AlertCircle, RefreshCw, HardDrive, Trash2, Loader2, ChevronDown, CopyX } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PullImageDialog from './pull-image-dialog.svelte';
	import { formatBytes, cn } from '$lib/utils';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let { data }: { data: PageData } = $props();
	let images = $state<EnhancedImageInfo[]>(data.images || []);
	let error = $state(data.error);
	let selectedIds = $state<string[]>([]);

	let isRefreshing = $state(false);
	let isPullDialogOpen = $state(false);
	let isPullingImage = $state(false);
	let pullProgress = $state(0);

	let isDeletingSelected = $state(false);
	let isConfirmDeleteDialogOpen = $state(false);

	let isPruning = $state(false);
	let isConfirmPruneDialogOpen = $state(false);

	$effect(() => {
		images = data.images || [];
		error = data.error;
	});

	const totalImages = $derived(images?.length || 0);
	const totalSize = $derived(images?.reduce((acc, img) => acc + (img.size || 0), 0) || 0);

	async function handlePullImageSubmit(event: { imageRef: string; tag?: string; platform?: string }) {
		const { imageRef, tag = 'latest', platform } = event;

		isPullingImage = true;

		try {
			const encodedImageRef = encodeURIComponent(imageRef);
			const eventSource = new EventSource(`/api/images/pull-stream/${encodedImageRef}?tag=${tag}${platform ? `&platform=${platform}` : ''}`);

			eventSource.onmessage = (event) => {
				const data = JSON.parse(event.data);

				if (data.error) {
					eventSource.close();
					toast.error(`Pull failed: ${data.error}`);
					isPullingImage = false;
					return;
				}

				if (data.progress !== undefined) {
					pullProgress = data.progress;
				}

				if (data.complete) {
					eventSource.close();
					const fullImageRef = `${imageRef}:${tag}`;
					toast.success(`Image "${fullImageRef}" pulled successfully.`);
					isPullDialogOpen = false;

					setTimeout(async () => {
						await refreshData();
					}, 500);
					isPullingImage = false;
				}
			};

			eventSource.onerror = (err) => {
				console.error('EventSource error:', err);
				eventSource.close();
				toast.error('Connection to server lost while pulling image');
				isPullingImage = false;
			};
		} catch (err: any) {
			console.error('Failed to pull image:', err);
			toast.error(`Failed to pull image: ${err.message}`);
			isPullingImage = false;
		}
	}

	async function handleDeleteSelected() {
		isDeletingSelected = true;
		const deletePromises = selectedIds.map(async (id) => {
			try {
				const image = images.find((img) => img.id === id);
				if (image?.inUse) {
					toast.error(`Image "${image.repo}:${image.tag}" (${id.substring(0, 12)}) is in use and cannot be deleted.`);
					return { id, success: false, error: 'Image in use' };
				}

				const response = await fetch(`/api/images/${encodeURIComponent(id)}`, {
					method: 'DELETE'
				});
				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.error || `HTTP error! status: ${response.status}`);
				}
				return {
					id,
					success: true,
					repoTag: image?.repoTags?.[0] || id.substring(0, 12)
				};
			} catch (err: any) {
				console.error(`Failed to delete image "${id}":`, err);
				const image = images.find((img) => img.id === id);
				return {
					id,
					success: false,
					error: err.message,
					repoTag: image?.repoTags?.[0] || id.substring(0, 12)
				};
			}
		});

		const results = await Promise.all(deletePromises);
		const successfulDeletes = results.filter((r) => r.success);
		const failedDeletes = results.filter((r) => !r.success);

		if (successfulDeletes.length > 0) {
			toast.success(`Successfully deleted ${successfulDeletes.length} image(s).`);
			setTimeout(async () => {
				await refreshData();
				selectedIds = [];
			}, 500);
		}

		failedDeletes.forEach((r) => {
			if (r.error !== 'Image in use') {
				toast.error(`Failed to delete image "${r.repoTag}": ${r.error}`);
			}
		});

		isDeletingSelected = false;
		isConfirmDeleteDialogOpen = false;
	}

	async function handlePruneImages() {
		isPruning = true;
		try {
			const response = await fetch('/api/images/prune', {
				method: 'POST'
			});
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || `HTTP error! status: ${response.status}`);
			}

			toast.success(result.message || 'Image prune completed.');
			setTimeout(async () => {
				await refreshData();
			}, 500);
		} catch (err: any) {
			console.error('Failed to prune images:', err);
			toast.error(`Failed to prune images: ${err.message}`);
		} finally {
			isPruning = false;
			isConfirmPruneDialogOpen = false;
		}
	}

	async function refreshData() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			await invalidateAll();
			images = data.images;
		} catch (err) {
			console.error('Error refreshing images:', err);
			toast.error('Failed to refresh image list.');
		} finally {
			setTimeout(() => {
				isRefreshing = false;
			}, 300);
		}
	}

	function openPullDialog() {
		isPullDialogOpen = true;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Docker Images</h1>
			<p class="text-sm text-muted-foreground mt-1">Manage your Docker images</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="secondary" size="icon" onclick={refreshData} disabled={isRefreshing}>
				<RefreshCw class={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
				<span class="sr-only">Refresh</span>
			</Button>
			<Button variant="secondary" onclick={() => (isConfirmPruneDialogOpen = true)} disabled={isPruning}>
				{#if isPruning}
					<Loader2 class="w-4 h-4 animate-spin" /> Pruning...
				{:else}
					<CopyX class="w-4 h-4" /> Prune Unused
				{/if}
			</Button>
			<Button variant="secondary" onclick={openPullDialog} disabled={isPullingImage}>
				{#if isPullingImage}
					<Loader2 class="w-4 h-4 animate-spin" /> Pulling...
				{:else}
					<Download class="w-4 h-4" /> Pull Image
				{/if}
			</Button>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Error Loading Images</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Images</p>
					<p class="text-2xl font-bold">{totalImages}</p>
				</div>
				<div class="bg-blue-500/10 p-2 rounded-full">
					<HardDrive class="h-5 w-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Size</p>
					<p class="text-2xl font-bold">{formatBytes(totalSize)}</p>
				</div>
				<div class="bg-purple-500/10 p-2 rounded-full">
					<HardDrive class="h-5 w-5 text-purple-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	{#if images && images.length > 0}
		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Image List</Card.Title>
						<Card.Description>View and manage your Docker images</Card.Description>
					</div>
					<div class="flex items-center gap-2">
						{#if selectedIds.length > 0}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="outline" disabled={isDeletingSelected} aria-label={`Group actions for ${selectedIds.length} selected image(s)`}>
											{#if isDeletingSelected}
												<Loader2 class="w-4 h-4 mr-2 animate-spin" />
												Processing...
											{:else}
												Actions ({selectedIds.length})
												<ChevronDown class="w-4 h-4 ml-2" />
											{/if}
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={() => (isConfirmDeleteDialogOpen = true)} class="text-red-500 focus:!text-red-700" disabled={isDeletingSelected}>
										<Trash2 class="w-4 h-4" />
										Delete Selected
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<UniversalTable
					data={images}
					{columns}
					idKey="id"
					display={{
						filterPlaceholder: 'Search images...',
						noResultsMessage: 'No images found'
					}}
					sort={{
						defaultSort: { id: 'repo', desc: false }
					}}
					bind:selectedIds
				/>
			</Card.Content>
		</Card.Root>
	{:else if !error}
		<div class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card">
			<HardDrive class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
			<p class="text-lg font-medium">No images found</p>
			<p class="text-sm text-muted-foreground mt-1 max-w-md">Pull a new image using the "Pull Image" button above or use the Docker CLI</p>
			<div class="flex gap-3 mt-4">
				<Button variant="outline" size="sm" onclick={refreshData}>
					<RefreshCw class="h-4 w-4" />
					Refresh
				</Button>
				<Button variant="outline" size="sm" onclick={openPullDialog}>
					<Download class="h-4 w-4" />
					Pull Image
				</Button>
			</div>
		</div>
	{/if}

	<PullImageDialog bind:open={isPullDialogOpen} isPulling={isPullingImage} {pullProgress} onSubmit={handlePullImageSubmit} />

	<Dialog.Root bind:open={isConfirmDeleteDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete Selected Images</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to delete {selectedIds.length} selected image(s)? This action cannot be undone. Images currently used by containers will not be deleted.
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-end gap-3 pt-6">
				<Button variant="outline" onclick={() => (isConfirmDeleteDialogOpen = false)} disabled={isDeletingSelected}>Cancel</Button>
				<Button variant="destructive" onclick={handleDeleteSelected} disabled={isDeletingSelected}>
					{#if isDeletingSelected}
						<Loader2 class="w-4 h-4 mr-2 animate-spin" /> Deleting...
					{:else}
						Delete {selectedIds.length} Image{#if selectedIds.length > 1}s{/if}
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={isConfirmPruneDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Prune Unused Images</Dialog.Title>
				<Dialog.Description>Are you sure you want to remove all unused (dangling) Docker images? This will free up disk space but cannot be undone. Images actively used by containers will not be affected.</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-end gap-3 pt-6">
				<Button variant="outline" onclick={() => (isConfirmPruneDialogOpen = false)} disabled={isPruning}>Cancel</Button>
				<Button variant="destructive" onclick={handlePruneImages} disabled={isPruning}>
					{#if isPruning}
						<Loader2 class="w-4 h-4 mr-2 animate-spin" /> Pruning...
					{:else}
						Prune Images
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
