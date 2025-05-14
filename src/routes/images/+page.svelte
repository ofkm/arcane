<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/types/docker';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, AlertCircle, HardDrive, Trash2, Loader2, ChevronDown, CopyX, Ellipsis, ScanSearch, CircleFadingArrowUp, Funnel, CircleCheck, CircleArrowUp } from '@lucide/svelte';
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
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { data }: { data: PageData } = $props();
	let images = $state<EnhancedImageInfo[]>(data.images || []);
	let error = $state(data.error);
	let selectedIds = $state<string[]>([]);

	let imageFilters = $state({
		showUsed: true,
		showUnused: true
	});

	// Add with other derived values
	const filteredImages = $derived(images.filter((img) => (imageFilters.showUsed && img.inUse) || (imageFilters.showUnused && !img.inUse)));

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
	const totalSize = $derived(images?.reduce((acc, img) => acc + (img.size || 0), 0) || 0);

	async function handlePullImageSubmit(event: { imageRef: string; tag?: string; platform?: string; registryUrl?: string }) {
		const { imageRef, tag = 'latest', platform, registryUrl } = event;

		isLoading.pulling = true;
		pullProgress = 0; // Reset progress

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
					// Avoid warning for default Docker Hub
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
					return; // Don't process as progress/completion
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
					}, 500); // Give Docker a moment before invalidating
					isLoading.pulling = false;
				}
			};

			eventSource.onerror = (err) => {
				console.error('EventSource error:', err);
				eventSource.close();
				toast.error('Connection to server lost while pulling image');
				isLoading.pulling = false;
			};
		} catch (err: any) {
			console.error('Failed to pull image:', err);
			toast.error(`Failed to pull image: ${err.message}`);
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
						const image = images.find((img) => img.id === id);
						const imageIdentifier = image?.repoTags?.[0] || id.substring(0, 12);

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
		await handleApiResultWithCallbacks({
			result: await tryCatch(imageApi.prune()),
			message: 'Failed to Prune Images',
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async (result: any) => {
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
		const image = images.find((img) => img.id === id);
		const imageIdentifier = image?.repoTags?.[0] || id.substring(0, 12);

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

	async function checkAllMaturity() {
		isLoading.checking = true;

		const imageIdsToCheck = images.filter((image) => image.id).map((image) => image.id);

		if (imageIdsToCheck.length === 0) {
			toast.info('No images to check for updates.');
			isLoading.checking = false;
			return;
		}

		console.log(`Client: Attempting to check maturity for ${imageIdsToCheck.length} images.`);

		try {
			const batchResult = await imageApi.checkMaturityBatch(imageIdsToCheck);

			if (!batchResult || typeof batchResult.success !== 'boolean') {
				toast.error('Maturity check failed: Invalid response from server.');
				isLoading.checking = false;
				return;
			}

			const stats = batchResult.stats || { total: 0, success: 0, failed: 0 };
			const numSuccessfullyUpdated = stats.success || 0; // Images for which new data was likely returned
			const numFailedByBackend = stats.failed || 0;
			const numAttemptedByBackend = stats.total || numSuccessfullyUpdated + numFailedByBackend;

			console.log(`Backend Response: Attempted to process ${numAttemptedByBackend}, Succeeded (updated) ${numSuccessfullyUpdated}, Failed ${numFailedByBackend}.`);

			if (batchResult.success) {
				// Overall API call was successful
				if (numSuccessfullyUpdated > 0) {
					toast.success(`Successfully retrieved updates for ${numSuccessfullyUpdated} image(s).`);
				}
				if (numFailedByBackend > 0) {
					toast.warning(`Backend failed to check updates for ${numFailedByBackend} image(s).`);
				}

				if (imageIdsToCheck.length > numAttemptedByBackend && numAttemptedByBackend >= 0) {
					const notAttemptedCount = imageIdsToCheck.length - numAttemptedByBackend;
					toast.info(`Server processed ${numAttemptedByBackend} of ${imageIdsToCheck.length} images. ${notAttemptedCount} were not processed by the backend.`);
				} else if (numAttemptedByBackend > numSuccessfullyUpdated + numFailedByBackend) {
					// This case implies some images were "attempted" but neither succeeded in update nor explicitly failed.
					const processedWithoutUpdate = numAttemptedByBackend - (numSuccessfullyUpdated + numFailedByBackend);
					if (processedWithoutUpdate > 0) {
						toast.info(`${processedWithoutUpdate} image(s) were checked by the backend but had no new update status reported.`);
					}
				}

				if (numSuccessfullyUpdated === 0 && numFailedByBackend === 0 && numAttemptedByBackend === 0 && imageIdsToCheck.length > 0) {
					toast.info('Maturity check ran, but the backend reported no images were processed or updated.');
				}

				// Always invalidate if the API call itself was successful,
				// as some images might have been updated.
				await invalidateAll();
			} else {
				// The API call itself failed (e.g., HTTP 500, or batchResult.success is false)
				toast.error(`Maturity check request failed: ${batchResult.error || 'Unknown server error.'}`);
			}
		} catch (error) {
			console.error('Client-side error during checkAllMaturity:', error);
			toast.error(`Client-side error checking image updates: ${(error as Error).message}`);
		} finally {
			isLoading.checking = false;
		}
	}

	$effect(() => {
		images = data.images;
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Docker Images</h1>
			<p class="text-sm text-muted-foreground mt-1">Manage your Docker images</p>
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
						<Card.Description>View and manage your Docker images</Card.Description>
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
							<Button variant="destructive" onclick={() => handleDeleteSelected()} disabled={isLoading.removing}>
								{#if isLoading.removing}
									<Loader2 class="mr-2 animate-spin size-4" />
									Processing...
								{:else}
									<Trash2 class="size-4" />
									Delete Selected
								{/if}
							</Button>
						{/if}
						<Button variant="secondary" onclick={() => (isConfirmPruneDialogOpen = true)} disabled={isLoading.pruning}>
							{#if isLoading.pruning}
								<Loader2 class="animate-spin size-4" /> Pruning...
							{:else}
								<CopyX class="size-4" /> Prune Unused
							{/if}
						</Button>
						<Button variant="secondary" onclick={() => (isPullDialogOpen = true)} disabled={isLoading.pulling}>
							{#if isLoading.pulling}
								<Loader2 class="animate-spin size-4" /> Pulling...
							{:else}
								<Download class="size-4" /> Pull Image
							{/if}
						</Button>
						<Button variant="outline" onclick={() => checkAllMaturity()} disabled={isLoading.checking}>
							{#if isLoading.checking}
								<Loader2 class="mr-2 animate-spin size-4" /> Checking...
							{:else}
								<ScanSearch class="mr-2 size-4" /> Check Updates
							{/if}
						</Button>
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
						{ accessorKey: 'id', header: 'Image ID', enableSorting: false },
						{ accessorKey: 'size', header: 'Size' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					idKey="id"
					display={{
						filterPlaceholder: 'Search images...',
						noResultsMessage: 'No images found'
					}}
					sort={{
						defaultSort: { id: 'repo', desc: false }
					}}
					bind:selectedIds
				>
					{#snippet rows({ item })}
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div class="flex items-center flex-1">
									<!-- Maturity Indicator with proper Tooltip -->
									{#if item.maturity}
										<Tooltip.Provider>
											<Tooltip.Root>
												<Tooltip.Trigger>
													<span class="inline-flex items-center justify-center align-middle mr-2 size-4">
														{#if !item.maturity.updatesAvailable}
															<!-- Green checkmark for up-to-date images -->

															<CircleCheck class="text-green-500 size-10" fill="none" stroke="currentColor" strokeWidth="2" />
															<!-- <CircleFadingArrowUp class="text-green-500 size-4" fill="none" stroke="currentColor" strokeWidth="2" /> -->
														{:else if item.maturity.status === 'Not Matured'}
															<!-- Yellow warning icon for non-matured updates -->
															<CircleFadingArrowUp class="text-yellow-500 size-10" fill="none" stroke="currentColor" stroke-width="2" />
														{:else}
															<!-- Blue checkmark for matured updates -->
															<CircleArrowUp class="text-blue-500 size-10" fill="none" stroke="currentColor" stroke-width="2" />
														{/if}
													</span>
												</Tooltip.Trigger>
												<!-- Tooltip content updated -->
												<Tooltip.Content side="right" class="p-3 max-w-[200px] relative tooltip-with-arrow" align="center">
													<div class="space-y-2">
														<div class="flex items-center gap-2">
															{#if !item.maturity.updatesAvailable}
																<!-- Green checkmark in tooltip -->
																<CircleCheck class="text-green-500 size-5" fill="none" stroke="currentColor" strokeWidth="2" />
																<span class="font-medium">Image Up to Date</span>
															{:else if item.maturity.status === 'Not Matured'}
																<!-- Yellow warning icon in tooltip -->
																<CircleFadingArrowUp class="text-yellow-500 size-5" fill="none" stroke="currentColor" stroke-width="2" />
																<span class="font-medium">Update Available (Not Matured)</span>
															{:else}
																<!-- Blue info icon in tooltip -->
																<CircleArrowUp class="text-blue-500 size-5" fill="none" stroke="currentColor" stroke-width="2" />
																<span class="font-medium">Matured Update Available</span>
															{/if}
														</div>

														<div class="pt-1 border-t border-gray-200 dark:border-gray-700 justify-between">
															<div class="flex justify-between text-xs">
																<span class="text-muted-foreground">Version:</span>
																<span class="font-medium">{item.maturity.version || 'N/A'}</span>
															</div>

															<div class="flex justify-between text-xs mt-1">
																<span class="text-muted-foreground">Released:</span>
																<span>{item.maturity.date || 'Unknown'}</span>
															</div>

															<div class="flex justify-between text-xs mt-1">
																<span class="text-muted-foreground">Status:</span>
																<span class={item.maturity.status === 'Matured' ? 'text-green-500' : 'text-amber-500'}>
																	{item.maturity.status || 'Unknown'}
																</span>
															</div>
														</div>
													</div>
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
									{:else}
										<!-- Tooltip for missing maturity info -->
										<Tooltip.Provider>
											<Tooltip.Root>
												<Tooltip.Trigger>
													<span class="inline-flex items-center justify-center mr-2 opacity-30 size-4">
														<svg class="text-gray-500 size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
															<circle cx="12" cy="12" r="10" />
															<path d="M9 12l2 2 4-4" />
														</svg>
													</span>
												</Tooltip.Trigger>
												<Tooltip.Content side="right" class="p-2 relative tooltip-with-arrow" align="center">
													<span class="text-xs">Maturity status not available.</span>
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
									{/if}
									<!-- End Maturity Indicator -->

									<!-- Repository name as a separate element -->
									<a class="font-medium hover:underline shrink truncate" href="/images/{item.id}/">
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
						<Table.Cell class="truncate">{item.id}</Table.Cell>
						<Table.Cell>{formatBytes(item.size)}</Table.Cell>
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
										<DropdownMenu.Item onclick={() => goto(`/images/${item.id}`)}>
											<ScanSearch class="size-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => pullImageByRepoTag(item.repoTags?.[0])} disabled={isLoading.pulling || !item.repoTags?.[0]}>
											{#if isLoading.pulling}
												<Loader2 class="animate-spin size-4" />
												Pulling...
											{:else}
												<Download class="size-4" />
												Pull
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => handleImageRemove(item.id)}>
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

	/* Top side: Arrow on bottom of tooltip pointing down */
	:global(.tooltip-with-arrow[data-side='top']::before) {
		bottom: -4px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		border-top: none;
		border-left: none;
	}

	/* Bottom side: Arrow on top of tooltip pointing up */
	:global(.tooltip-with-arrow[data-side='bottom']::before) {
		top: -4px;
		left: 50%;
		transform: translateX(-50%) rotate(225deg);
		border-bottom: none;
		border-right: none;
	}

	/* Left side: Arrow on right of tooltip pointing right */
	:global(.tooltip-with-arrow[data-side='left']::before) {
		top: 50%;
		right: -4px;
		transform: translateY(-50%) rotate(-45deg);
		border-left: none;
		border-bottom: none;
	}

	/* Right side: Arrow on left of tooltip pointing left - improved */
	:global(.tooltip-with-arrow[data-side='right']::before) {
		top: 50%;
		left: -4px;
		transform: translateY(-50%) rotate(-45deg);
		border-left: none;
		border-top: none;
		box-shadow: -1px 1px 1px rgba(0, 0, 0, 0.05);
	}
</style>
