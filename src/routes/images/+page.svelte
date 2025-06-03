<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/types/docker';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, AlertCircle, HardDrive, Trash2, Loader2, ChevronDown, CopyX, Ellipsis, ScanSearch, Funnel, RefreshCw } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PullImageDialog from './pull-image-dialog.svelte';
	import { formatBytes } from '$lib/utils/bytes.util';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import ImageAPIService from '$lib/services/api/image-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { settingsStore } from '$lib/stores/settings-store';
	import MaturityItem from '$lib/components/maturity-item.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { maturityStore } from '$lib/stores/maturity-store';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';

	let { data }: { data: PageData } = $props();
	let images = $derived(data.images || []);
	let error = $state(data.error);
	let selectedIds = $state<string[]>([]);

	let imageFilters = $state({
		showUsed: true,
		showUnused: true
	});

	let isLoading = $state({
		pulling: false,
		removing: false,
		refreshing: false,
		pruning: false,
		checking: false
	});

	$effect(() => {
		if (data.settings) {
			settingsStore.update((current) => ({
				...current,
				...data.settings
			}));
		}
	});

	const imageApi = new ImageAPIService();

	let isPullDialogOpen = $state(false);
	let pullProgress = $state(0);

	let isConfirmPruneDialogOpen = $state(false);

	const totalImages = $derived(images?.length || 0);
	const totalSize = $derived(images?.reduce((acc, img) => acc + (img.Size || 0), 0) || 0);

	const enhancedImages = $derived(
		images.map((image) => {
			const storedMaturity = $maturityStore.maturityData[image.Id];
			return {
				...image,
				maturity: storedMaturity || image.maturity
			};
		})
	);

	const filteredImages = $derived(enhancedImages.filter((img) => (imageFilters.showUsed && img.inUse) || (imageFilters.showUnused && !img.inUse)) as EnhancedImageInfo[]);

	onMount(async () => {
		await loadMaturityData();
	});

	async function loadMaturityData() {
		const visibleImageIds = images
			.filter((img) => img.repo !== '<none>' && img.tag !== '<none>')
			.slice(0, 20)
			.map((img) => img.Id);

		if (visibleImageIds.length === 0) return;

		isLoading.checking = true;
		try {
			const BATCH_SIZE = 5;
			for (let i = 0; i < visibleImageIds.length; i += BATCH_SIZE) {
				const batch = visibleImageIds.slice(i, i + BATCH_SIZE);
				await imageApi.checkMaturityBatch(batch);
				if (i + BATCH_SIZE < visibleImageIds.length) {
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
			}
		} catch (error) {
			console.error('Error loading maturity data:', error);
		} finally {
			isLoading.checking = false;
		}
	}

	async function handlePullImageSubmit(event: { imageRef: string; tag?: string; platform?: string; registryUrl?: string }) {
		const { imageRef, tag = 'latest', platform, registryUrl } = event;

		isLoading.pulling = true;
		pullProgress = 0;

		try {
			const encodedImageRef = encodeURIComponent(imageRef);
			let apiUrl = `/api/images/pull-stream/${encodedImageRef}?tag=${tag}`;

			if (platform) {
				apiUrl += `&platform=${encodeURIComponent(platform)}`;
			}

			if (registryUrl) {
				const credentials = $settingsStore.registryCredentials || [];
				const foundCredential = credentials.find((cred) => cred.url === registryUrl);

				if (foundCredential && foundCredential.username) {
					toast.info(`Attempting pull from ${foundCredential.url} with user ${foundCredential.username}`);
				} else if (registryUrl !== 'docker.io' && registryUrl !== '') {
					toast.error(`Credentials not found for ${registryUrl}. Attempting unauthenticated pull.`);
				}
			}

			const eventSource = new EventSource(apiUrl);

			eventSource.onmessage = (event) => {
				const data = JSON.parse(event.data);

				if (data.error) {
					eventSource.close();
					toast.error(`Pull failed: ${data.error}`);
					isLoading.pulling = false;
					return;
				}

				if (data.type === 'info' || data.type === 'warning') {
					if (data.type === 'info') toast.info(data.message);
					if (data.type === 'warning') toast.error(data.message);
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
						await invalidateAll();
					}, 500);
					isLoading.pulling = false;
				}
			};

			eventSource.onerror = (err) => {
				console.error('EventSource error:', err);
				eventSource.close();
				toast.error('Connection to server lost while pulling image');
				isLoading.pulling = false;
			};
		} catch (err: unknown) {
			console.error('Failed to pull image:', err);
			toast.error(`Failed to pull image: ${err instanceof Error ? err.message : String(err)}`);
			isLoading.pulling = false;
		}
	}

	async function handleDeleteSelected() {
		openConfirmDialog({
			title: 'Delete Selected Images',
			message: `Are you sure you want to delete ${selectedIds.length} selected image(s)? This action cannot be undone. Images currently used by containers will not be deleted.
`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.removing = true;

					let successCount = 0;
					let failureCount = 0;

					for (const id of selectedIds) {
						const image = images.find((img) => img.Id === id);
						const imageIdentifier = image?.RepoTags?.[0] || id.substring(0, 12);

						if (image?.inUse) {
							toast.error(`Image "${imageIdentifier}" is in use and cannot be deleted.`);
							failureCount++;
							continue;
						}

						await handleApiResultWithCallbacks({
							result: await tryCatch(imageApi.remove(id)),
							message: `Failed to delete image "${imageIdentifier}"`,
							setLoadingState: (value) => (isLoading.removing = value),
							onSuccess: async () => {
								toast.success(`Image "${imageIdentifier}" deleted successfully.`);
								successCount++;
							}
						});
					}

					console.log(`Finished deleting. Success: ${successCount}, Failed: ${failureCount}`);
					if (successCount > 0) {
						setTimeout(async () => {
							await invalidateAll();
						}, 500);
					}
					selectedIds = [];
				}
			}
		});
	}

	async function handlePruneImages() {
		isLoading.pruning = true;
		await handleApiResultWithCallbacks({
			result: await tryCatch(imageApi.prune()),
			message: 'Failed to Prune Images',
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async (result: { message?: string }) => {
				isConfirmPruneDialogOpen = false;
				toast.success(result?.message ?? 'Images pruned successfully.');
				await invalidateAll();
			}
		});
	}

	async function pullImageByRepoTag(repoTag: string | undefined) {
		if (!repoTag) {
			toast.error('Cannot pull image without a repository tag');
			return;
		}

		let [imageRef, tag] = repoTag.split(':');
		tag = tag || 'latest';

		await handleApiResultWithCallbacks({
			result: await tryCatch(imageApi.pull(imageRef, tag)),
			message: `Failed to pull image "${repoTag}"`,
			setLoadingState: (value) => (isLoading.pulling = value),
			onSuccess: async () => {
				toast.success(`Image "${repoTag}" pulled successfully.`);
				await invalidateAll();
			}
		});
	}

	async function handleImageRemove(id: string) {
		const image = images.find((img) => img.Id === id);
		const imageIdentifier = image?.RepoTags?.[0] || id.substring(0, 12);

		openConfirmDialog({
			title: 'Delete Image',
			message: `Are you sure you want to delete ${imageIdentifier}? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					await handleApiResultWithCallbacks({
						result: await tryCatch(imageApi.remove(id)),
						message: 'Failed to Remove Image',
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(`Image "${imageIdentifier}" deleted successfully.`);
							await invalidateAll();
						}
					});
				}
			}
		});
	}

	async function triggerManualMaturityCheck(force = false) {
		isLoading.checking = true;
		try {
			const response = await fetch('/api/images/maturity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ force })
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message);
				if (result.stats) {
					console.log('Maturity check stats:', result.stats);
				}
				await invalidateAll();
			} else {
				toast.error(`Manual check failed: ${result.error}`);
			}
		} catch (error) {
			console.error('Manual maturity check error:', error);
			toast.error('Failed to trigger manual maturity check');
		} finally {
			isLoading.checking = false;
		}
	}

	let observer: IntersectionObserver | null = null;

	onMount(() => {
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const imageId = entry.target.getAttribute('data-image-id');
						if (imageId) {
							loadImageMaturity(imageId);
						}
					}
				});
			},
			{ rootMargin: '200px' }
		);

		setTimeout(() => {
			document.querySelectorAll('[data-image-id]').forEach((el) => {
				observer?.observe(el);
			});
		}, 100);
	});

	onDestroy(() => {
		observer?.disconnect();
	});

	async function loadImageMaturity(imageId: string) {
		try {
			await imageApi.checkMaturity(imageId);
		} catch (error) {
			console.error(`Error loading maturity for image ${imageId}:`, error);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Container Images</h1>
			<p class="text-sm text-muted-foreground mt-1">View and Manage your Container Images</p>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
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
					<HardDrive class="text-blue-500 size-5" />
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
					<HardDrive class="text-purple-500 size-5" />
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
					</div>

					<div class="flex items-center gap-2">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline">
										<Funnel class="size-4" />
										Filter
										<ChevronDown class="size-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Label>Image Usage</DropdownMenu.Label>
								<DropdownMenu.CheckboxItem
									checked={imageFilters.showUsed}
									onCheckedChange={(checked) => {
										imageFilters.showUsed = checked;
									}}
								>
									Show Used Images
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={imageFilters.showUnused}
									onCheckedChange={(checked) => {
										imageFilters.showUnused = checked;
									}}
								>
									Show Unused Images
								</DropdownMenu.CheckboxItem>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						{#if selectedIds.length > 0}
							<ArcaneButton action="remove" onClick={() => handleDeleteSelected()} loading={isLoading.removing} disabled={isLoading.removing} />
						{/if}
						<ArcaneButton action="remove" label="Prune Unused" onClick={() => (isConfirmPruneDialogOpen = true)} loading={isLoading.pruning} loadingLabel="Pruning..." disabled={isLoading.pruning} />
						<ArcaneButton action="pull" label="Pull Image" onClick={() => (isPullDialogOpen = true)} loading={isLoading.pulling} loadingLabel="Pulling..." disabled={isLoading.pulling} />
						<ArcaneButton action="inspect" label="Check Updates" onClick={() => triggerManualMaturityCheck(true)} loading={isLoading.checking} loadingLabel="Checking..." disabled={isLoading.checking} />
					</div>
				</div>
			</Card.Header>

			<Card.Content>
				<UniversalTable
					data={filteredImages}
					columns={[
						{ accessorKey: 'repo', header: 'Name' },
						{ accessorKey: 'inUse', header: ' ', enableSorting: false },
						{ accessorKey: 'tag', header: 'Tag' },
						{ accessorKey: 'Id', header: 'Image ID', enableSorting: false },
						{ accessorKey: 'Size', header: 'Size' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					idKey="Id"
					display={{
						filterPlaceholder: 'Search images...',
						noResultsMessage: 'No images found'
					}}
					pagination={{
						pageSize: tablePersistence.getPageSize('images')
					}}
					onPageSizeChange={(newSize) => {
						tablePersistence.setPageSize('images', newSize);
					}}
					sort={{
						defaultSort: { id: 'repo', desc: false }
					}}
					bind:selectedIds
				>
					{#snippet rows({ item })}
						<Table.Cell data-image-id={item.Id}>
							<div class="flex items-center gap-2">
								<div class="flex items-center flex-1">
									<MaturityItem maturity={item.maturity} />
									<a class="font-medium hover:underline shrink truncate" href="/images/{item.Id}/">
										{item.repo}
									</a>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if !item.inUse}
								<StatusBadge text="Unused" variant="amber" />
							{:else}
								<StatusBadge text="In Use" variant="green" />
							{/if}
						</Table.Cell>
						<Table.Cell>{item.tag}</Table.Cell>
						<Table.Cell class="truncate">{item.Id}</Table.Cell>
						<Table.Cell>{formatBytes(item.Size)}</Table.Cell>
						<Table.Cell>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
											<span class="sr-only">Open menu</span>
											<Ellipsis />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Group>
										<DropdownMenu.Item onclick={() => goto(`/images/${item.Id}`)}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => pullImageByRepoTag(item.RepoTags?.[0])} disabled={isLoading.pulling || !item.RepoTags?.[0]}>
											{#if isLoading.pulling}
												<Loader2 class="animate-spin size-4" />
												Pulling...
											{:else}
												<Download class="size-4" />
												Pull
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => handleImageRemove(item.Id)}>
											<Trash2 class="size-4" />
											Remove
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					{/snippet}
				</UniversalTable>
			</Card.Content>
		</Card.Root>
	{:else if !error}
		<div class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card">
			<HardDrive class="text-muted-foreground mb-4 opacity-40 size-12" />
			<p class="text-lg font-medium">No images found</p>
			<p class="text-sm text-muted-foreground mt-1 max-w-md">Pull a new image using the "Pull Image" button above or use the Docker CLI</p>
			<div class="flex gap-3 mt-4">
				<Button variant="outline" size="sm" onclick={() => (isPullDialogOpen = true)}>
					<Download class="size-4" />
					Pull Image
				</Button>
			</div>
		</div>
	{/if}

	<PullImageDialog bind:open={isPullDialogOpen} isPulling={isLoading.pulling} {pullProgress} onSubmit={handlePullImageSubmit} />

	<Dialog.Root bind:open={isConfirmPruneDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Prune Unused Images</Dialog.Title>
				<Dialog.Description>Are you sure you want to remove all unused (dangling) Docker images? This will free up disk space but cannot be undone. Images actively used by containers will not be affected.</Dialog.Description>
			</Dialog.Header>
			<div class="flex justify-end gap-3 pt-6">
				<Button variant="outline" onclick={() => (isConfirmPruneDialogOpen = false)} disabled={isLoading.pruning}>Cancel</Button>
				<Button variant="destructive" onclick={handlePruneImages} disabled={isLoading.pruning}>
					{#if isLoading.pruning}
						<Loader2 class="mr-2 animate-spin size-4" /> Pruning...
					{:else}
						Prune Images
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>

<style>
	:global(.tooltip-with-arrow) {
		position: relative;
		overflow: visible;
	}

	:global(.tooltip-with-arrow::before) {
		content: '';
		position: absolute;
		width: 8px;
		height: 8px;
		background-color: hsl(var(--popover));
		border: 1px solid hsl(var(--border));
		z-index: 1;
	}

	:global(.tooltip-with-arrow[data-side='top']::before) {
		bottom: -4px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		border-top: none;
		border-left: none;
	}

	:global(.tooltip-with-arrow[data-side='bottom']::before) {
		top: -4px;
		left: 50%;
		transform: translateX(-50%) rotate(225deg);
		border-bottom: none;
		border-right: none;
	}

	:global(.tooltip-with-arrow[data-side='left']::before) {
		top: 50%;
		right: -4px;
		transform: translateY(-50%) rotate(-45deg);
		border-left: none;
		border-bottom: none;
	}

	:global(.tooltip-with-arrow[data-side='right']::before) {
		top: 50%;
		left: -4px;
		transform: translateY(-50%) rotate(-45deg);
		border-left: none;
		border-top: none;
		box-shadow: -1px 1px 1px rgba(0, 0, 0, 0.05);
	}
</style>
