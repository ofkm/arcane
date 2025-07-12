<script lang="ts">
	import type { ContainerRegistry } from '$lib/models/container-registry';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, Ellipsis, Pencil, TestTube, Key } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { containerRegistryAPI } from '$lib/services/api';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';

	interface RegistryWithId extends ContainerRegistry {
		id: string;
	}

	let {
		registries,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onRegistriesChanged,
		onCreateRegistry,
		onEditRegistry
	}: {
		registries: Paginated<ContainerRegistry>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<Paginated<ContainerRegistry>>;
		onRegistriesChanged: () => Promise<void>;
		onCreateRegistry: () => void;
		onEditRegistry: (registry: ContainerRegistry) => void;
	} = $props();

	let isLoading = $state({
		remove: false,
		test: false
	});

	const transformedRegistries = $derived.by(() => {
		const transformed: RegistryWithId[] = registries.data.map((registry) => ({
			...registry,
			id: registry.id
		}));

		return {
			data: transformed,
			pagination: registries.pagination
		};
	});

	async function handleRefresh(
		options: SearchPaginationSortRequest
	): Promise<Paginated<RegistryWithId>> {
		const result = await onRefresh(options);
		const transformed: RegistryWithId[] = result.data.map((registry) => ({
			...registry,
			id: registry.id
		}));

		return {
			data: transformed,
			pagination: result.pagination
		};
	}

	async function handleDeleteRegistry(id: string, url: string) {
		openConfirmDialog({
			title: 'Remove Registry',
			message: `Are you sure you want to remove the registry "${url}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(containerRegistryAPI.deleteRegistry(id)),
						message: `Failed to remove registry "${url}"`,
						setLoadingState: (value) => (isLoading.remove = value),
						onSuccess: async () => {
							toast.success(`Registry "${url}" removed successfully.`);
							await onRegistriesChanged();
						}
					});
				}
			}
		});
	}

	async function handleDeleteSelectedRegistries() {
		const selectedRegistryList = registries.data.filter((registry) =>
			selectedIds.includes(registry.id)
		);

		openConfirmDialog({
			title: 'Remove Selected Registries',
			message: `Are you sure you want to remove ${selectedIds.length} selected registr${selectedIds.length === 1 ? 'y' : 'ies'}? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.remove = true;

					let successCount = 0;
					let failureCount = 0;

					for (const registryId of selectedIds) {
						const registry = registries.data.find((r) => r.id === registryId);
						if (!registry) continue;

						const result = await tryCatch(containerRegistryAPI.deleteRegistry(registryId));
						if (result.error) {
							failureCount++;
							toast.error(`Failed to delete registry "${registry.url}": ${result.error.message}`);
						} else {
							successCount++;
							toast.success(`Registry "${registry.url}" deleted successfully.`);
						}
					}

					isLoading.remove = false;
					if (successCount > 0) {
						setTimeout(async () => {
							await onRegistriesChanged();
						}, 500);
					}
					selectedIds = [];
				}
			}
		});
	}

	async function handleTestRegistry(id: string, url: string) {
		isLoading.test = true;
		try {
			const result = await containerRegistryAPI.testRegistry(id);
			toast.success(`Registry test passed: ${result.message || 'Connection successful'}`);
		} catch (error) {
			console.error('Error testing registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to test registry');
		} finally {
			isLoading.test = false;
		}
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	const hasRegistries = $derived(registries?.data?.length > 0);

	function getRegistryDisplayName(url: string) {
		if (!url || url === 'docker.io') return 'Docker Hub';
		if (url.includes('ghcr.io')) return 'GitHub Container Registry';
		if (url.includes('gcr.io')) return 'Google Container Registry';
		if (url.includes('quay.io')) return 'Quay.io Registry';
		return url;
	}
</script>

{#if hasRegistries}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Registry Credentials</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedIds.length > 0}
						<ArcaneButton
							action="remove"
							onClick={handleDeleteSelectedRegistries}
							loading={isLoading.remove}
							disabled={isLoading.remove}
						/>
					{/if}
					<ArcaneButton action="create" label="Add Registry" onClick={onCreateRegistry} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={transformedRegistries}
				bind:requestOptions
				bind:selectedIds
				onRefresh={handleRefresh}
				columns={[
					{ label: 'Registry URL', sortColumn: 'url' },
					{ label: 'Username', sortColumn: 'username' },
					{ label: 'Description', sortColumn: 'description' },
					{ label: 'Status', sortColumn: 'enabled' },
					{ label: 'Created', sortColumn: 'createdAt' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search registries..."
				noResultsMessage="No registry credentials found"
			>
				{#snippet rows({ item })}
					<Table.Cell class="font-medium">
						<div class="flex flex-col">
							<span class="font-medium">
								{item.url || 'docker.io'}
							</span>
							<span class="text-muted-foreground text-xs">
								{getRegistryDisplayName(item.url)}
							</span>
						</div>
					</Table.Cell>
					<Table.Cell>
						<span class="font-mono text-sm">{item.username || '-'}</span>
					</Table.Cell>
					<Table.Cell>
						<span class="text-muted-foreground text-sm">
							{item.description || 'No description provided'}
						</span>
					</Table.Cell>
					<Table.Cell>
						<span
							class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {item.enabled
								? 'bg-green-100 text-green-800'
								: 'bg-gray-100 text-gray-800'}"
						>
							{item.enabled ? 'Enabled' : 'Disabled'}
						</span>
					</Table.Cell>
					<Table.Cell>
						<span class="text-sm">
							{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
						</span>
					</Table.Cell>
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
									<DropdownMenu.Item
										onclick={() => handleTestRegistry(item.id, item.url)}
										disabled={isAnyLoading}
									>
										<TestTube class="size-4" />
										Test Connection
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={() => onEditRegistry(item)} disabled={isAnyLoading}>
										<Pencil class="size-4" />
										Edit
									</DropdownMenu.Item>
									<DropdownMenu.Item
										class="focus:text-red-700! text-red-500"
										onclick={() => handleDeleteRegistry(item.id, item.url)}
										disabled={isAnyLoading}
									>
										<Trash2 class="size-4" />
										Remove
									</DropdownMenu.Item>
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Table.Cell>
				{/snippet}
			</ArcaneTable>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<Key class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No registry credentials found</p>
		<p class="text-muted-foreground mt-1 text-sm">
			Add registry credentials to authenticate with private Docker registries when pulling images.
		</p>
	</div>
{/if}
