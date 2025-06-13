<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/types/docker';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, AlertCircle, HardDrive, Trash2, Loader2, ChevronDown, Ellipsis, ScanSearch, Funnel } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ImagePullSheet from '$lib/components/sheets/image-pull-sheet.svelte';
	import { formatBytes } from '$lib/utils/bytes.util';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import ImageAPIService from '$lib/services/api/image-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import MaturityItem from '$lib/components/maturity-item.svelte';
	import { maturityStore, triggerBulkMaturityCheck, enhanceImagesWithMaturity, loadImageMaturityBatch } from '$lib/stores/maturity-store';

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

	let isPullingInline = $state<Record<string, boolean>>({});

	const imageApi = new ImageAPIService();

	let isPullDialogOpen = $state(false);
	let isConfirmPruneDialogOpen = $state(false);

	const totalImages = $derived(images?.length || 0);
	const totalSize = $derived(images?.reduce((acc, img) => acc + (img.Size || 0), 0) || 0);

	const enhancedImages = $derived(enhanceImagesWithMaturity(images, $maturityStore.maturityData));

	const filteredImages = $derived(enhancedImages.filter((img) => (imageFilters.showUsed && img.InUse) || (imageFilters.showUnused && !img.InUse)) as EnhancedImageInfo[]);

	$effect(() => {
		if (images && images.length > 0) {
			loadImagesMaturity();
		}
	});

	async function loadImagesMaturity() {
		const imageIds = images
			.filter((img) => {
				if (!img.RepoTags || img.RepoTags.length === 0) return false;
				const repoTag = img.RepoTags[0];
				return repoTag !== '<none>:<none>' && repoTag.includes(':');
			})
			.map((img) => img.Id);

		if (imageIds.length > 0) {
			await loadImageMaturityBatch(imageIds);
		}
	}

	async function handleTriggerBulkMaturityCheck() {
		isLoading.checking = true;
		try {
			const result = await triggerBulkMaturityCheck();

			if (result.success) {
				toast.success(result.message);
				setTimeout(async () => {
					await invalidateAll();
				}, 1000);
			} else {
				toast.error(result.message);
			}
		} catch (error) {
			console.error('Bulk maturity check error:', error);
			toast.error('Failed to trigger maturity check');
		} finally {
			isLoading.checking = false;
		}
	}

	$effect(() => {
		if ($maturityStore.isChecking && !isLoading.checking) {
			isLoading.checking = true;
		} else if (!$maturityStore.isChecking && isLoading.checking) {
		}
	});

	async function handleDeleteSelected() {
		openConfirmDialog({
			title: 'Delete Selected Images',
			message: `Are you sure you want to delete ${selectedIds.length} selected image(s)? This action cannot be undone. Images currently used by containers will not be deleted.`,
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

						if (image?.InUse) {
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

					isLoading.removing = false;
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
			result: await tryCatch(imageApi.prune() as Promise<{ message?: string }>),
			message: 'Failed to Prune Images',
			setLoadingState: (value) => (isLoading.pruning = value),
			onSuccess: async (result: { message?: string }) => {
				isConfirmPruneDialogOpen = false;
				toast.success(result?.message ?? 'Images pruned successfully.');
				await invalidateAll();
			}
		});
	}

	async function handleInlineImagePull(imageIdentifier: string, fullImageName: string) {
		if (!fullImageName) {
			toast.error('Cannot pull image: name is missing.');
			return;
		}

		isPullingInline = { ...isPullingInline, [imageIdentifier]: true };
		let pullError = '';
		let lastStatusText = `Pulling ${fullImageName}...`;
		toast.info(lastStatusText, { id: `pull-${imageIdentifier}` });

		try {
			const response = await fetch('/api/images/pull', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ imageName: fullImageName })
			});

			if (!response.ok || !response.body) {
				const errorData = await response.json().catch(() => ({ error: 'Failed to pull image. Server returned an error.' }));
				const errorMessage = typeof errorData.error === 'string' ? errorData.error : errorData.message || `HTTP error ${response.status}`;
				throw new Error(errorMessage);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.trim() === '') continue;
					try {
						const data = JSON.parse(line);
						if (data.error) {
							console.error('Error in stream:', data.error);
							pullError = typeof data.error === 'string' ? data.error : data.error.message || 'An error occurred during pull.';
							lastStatusText = `Error: ${pullError}`;
							toast.error(lastStatusText, { id: `pull-${imageIdentifier}` });
							continue;
						}
						if (data.status) {
							lastStatusText = data.status;
						}
					} catch (e: any) {
						console.warn('Failed to parse stream line:', line, e);
					}
				}
			}

			if (pullError) {
				throw new Error(pullError);
			}

			toast.success(`Image "${fullImageName}" pulled successfully.`, {
				id: `pull-${imageIdentifier}`
			});
			await invalidateAll();
		} catch (error: any) {
			console.error(`Pull image error for ${fullImageName}:`, error);
			const message = error.message || `Failed to pull ${fullImageName}.`;
			toast.error(message, { id: `pull-${imageIdentifier}` });
		} finally {
			isPullingInline = { ...isPullingInline, [imageIdentifier]: false };
		}
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
					isLoading.removing = true;
					await handleApiResultWithCallbacks({
						result: await tryCatch(imageApi.remove(id)),
						message: 'Failed to Remove Image',
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(`Image "${imageIdentifier}" deleted successfully.`);
							await invalidateAll();
						}
					});
					isLoading.removing = false;
				}
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Container Images</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Container Images</p>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Error Loading Images</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Images</p>
					<p class="text-2xl font-bold">{totalImages}</p>
				</div>
				<div class="rounded-full bg-blue-500/10 p-2">
					<HardDrive class="size-5 text-blue-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center justify-between p-4">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Size</p>
					<p class="text-2xl font-bold">{formatBytes(totalSize)}</p>
				</div>
				<div class="rounded-full bg-purple-500/10 p-2">
					<HardDrive class="size-5 text-purple-500" />
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
						<ArcaneButton action="inspect" label="Recheck Maturities" onClick={() => handleTriggerBulkMaturityCheck()} loading={isLoading.checking} loadingLabel="Checking..." disabled={isLoading.checking} />
					</div>
				</div>
			</Card.Header>

			<Card.Content>
				<UniversalTable
					data={filteredImages}
					columns={[
						{ accessorKey: 'repo', header: 'Name' },
						{ accessorKey: 'InUse', header: ' ', enableSorting: false },
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
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div class="flex flex-1 items-center">
									<MaturityItem maturity={item.maturity} imageId={item.Id} repo={item.repo} tag={item.tag} isLoadingInBackground={$maturityStore.isChecking} />
									<a class="shrink truncate font-medium hover:underline" href="/images/{item.Id}/">
										{item.repo}
									</a>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if !item.InUse}
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
										<DropdownMenu.Item onclick={() => handleInlineImagePull(item.Id, item.RepoTags?.[0] || '')} disabled={isPullingInline[item.Id] || !item.RepoTags?.[0]}>
											{#if isPullingInline[item.Id]}
												<Loader2 class="size-4 animate-spin" />
												Pulling...
											{:else}
												<Download class="size-4" />
												Pull
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item class="focus:text-red-700! text-red-500" onclick={() => handleImageRemove(item.Id)}>
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
		<div class="bg-card flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center">
			<HardDrive class="text-muted-foreground mb-4 size-12 opacity-40" />
			<p class="text-lg font-medium">No images found</p>
			<p class="text-muted-foreground mt-1 max-w-md text-sm">Pull a new image using the "Pull Image" button above or use the Docker CLI</p>
			<div class="mt-4 flex gap-3">
				<Button variant="outline" size="sm" onclick={() => (isPullDialogOpen = true)}>
					<Download class="size-4" />
					Pull Image
				</Button>
			</div>
		</div>
	{/if}

	<ImagePullSheet bind:open={isPullDialogOpen} onPullFinished={() => invalidateAll()} />

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
						<Loader2 class="mr-2 size-4 animate-spin" /> Pruning...
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
