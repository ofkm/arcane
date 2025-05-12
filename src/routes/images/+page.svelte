<script lang="ts">
	import type { PageData } from './$types';
	import type { EnhancedImageInfo } from '$lib/types/docker';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download, AlertCircle, HardDrive, Trash2, Loader2, ChevronDown, CopyX, Ellipsis, ScanSearch, Plus, Funnel } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PullImageDialog from './pull-image-dialog.svelte';
	import { formatBytes } from '$lib/utils';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import ImageAPIService from '$lib/services/api/image-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { settingsStore } from '$lib/stores/settings-store';

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
		pruning: false
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
							selectedIds = [];
						}, 500);
					} else {
						selectedIds = [];
					}
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
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline">
										<Funnel class="w-4 h-4" />
										Filter
										<ChevronDown class="w-4 h-4" />
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
									<Loader2 class="w-4 h-4 mr-2 animate-spin" />
									Processing...
								{:else}
									<Trash2 class="w-4 h-4" />
									Delete Selected
								{/if}
							</Button>
						{/if}
						<Button variant="secondary" onclick={() => (isConfirmPruneDialogOpen = true)} disabled={isLoading.pruning}>
							{#if isLoading.pruning}
								<Loader2 class="w-4 h-4 animate-spin" /> Pruning...
							{:else}
								<CopyX class="w-4 h-4" /> Prune Unused
							{/if}
						</Button>
						<Button variant="secondary" onclick={() => (isPullDialogOpen = true)} disabled={isLoading.pulling}>
							{#if isLoading.pulling}
								<Loader2 class="w-4 h-4 animate-spin" /> Pulling...
							{:else}
								<Download class="w-4 h-4" /> Pull Image
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
								<span class="truncate">
									<a class="font-medium hover:underline" href="/images/{item.id}/">
										{item.repo}
									</a>
								</span>
								{#if !item.inUse}
									<StatusBadge text="Unused" variant="amber" />
								{/if}
							</div>
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
											<ScanSearch class="h-4 w-4" />
											Inspect
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => pullImageByRepoTag(item.repoTags?.[0])} disabled={isLoading.pulling || !item.repoTags?.[0]}>
											{#if isLoading.pulling}
												<Loader2 class="h-4 w-4 animate-spin" />
												Pulling...
											{:else}
												<Download class="h-4 w-4" />
												Pull
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={() => handleImageRemove(item.id)}>
											<Trash2 class="h-4 w-4" />
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
			<HardDrive class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
			<p class="text-lg font-medium">No images found</p>
			<p class="text-sm text-muted-foreground mt-1 max-w-md">Pull a new image using the "Pull Image" button above or use the Docker CLI</p>
			<div class="flex gap-3 mt-4">
				<Button variant="outline" size="sm" onclick={() => (isPullDialogOpen = true)}>
					<Download class="h-4 w-4" />
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
						<Loader2 class="w-4 h-4 mr-2 animate-spin" /> Pruning...
					{:else}
						Prune Images
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
