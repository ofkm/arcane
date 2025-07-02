<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Key, Plus, Trash2, Ellipsis, Pencil, RefreshCw, TestTube } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import ContainerRegistryFormSheet from '$lib/components/sheets/container-registry-sheet.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { toast } from 'svelte-sonner';
	import type { ContainerRegistry } from '$lib/models/container-registry';
	import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/dto/container-registry-dto';
	import { containerRegistryAPI } from '$lib/services/api';

	let { data } = $props();
	let registries = $state<ContainerRegistry[]>(data.registries || []);

	let isRegistryDialogOpen = $state(false);
	let registryToEdit = $state<ContainerRegistry | null>(null);
	let isLoadingAction = $state(false);

	async function loadRegistries() {
		try {
			registries = await containerRegistryAPI.getAllRegistries();
		} catch (error) {
			console.error('Error loading registries:', error);
			toast.error('Failed to load registries');
		}
	}

	function openCreateRegistryDialog() {
		registryToEdit = null;
		isRegistryDialogOpen = true;
	}

	function openEditRegistryDialog(registry: ContainerRegistry) {
		registryToEdit = registry;
		isRegistryDialogOpen = true;
	}

	// Updated function signature - now receives detail directly
	async function handleRegistryDialogSubmit(detail: { registry: ContainerRegistryCreateDto | ContainerRegistryUpdateDto; isEditMode: boolean }) {
		const { registry, isEditMode } = detail;
		isLoadingAction = true;

		try {
			if (isEditMode && registryToEdit?.id) {
				await containerRegistryAPI.updateRegistry(registryToEdit.id, registry as ContainerRegistryUpdateDto);
				toast.success('Registry updated successfully');
			} else {
				await containerRegistryAPI.createRegistry(registry as ContainerRegistryCreateDto);
				toast.success('Registry created successfully');
			}

			await loadRegistries();
			isRegistryDialogOpen = false;
		} catch (error) {
			console.error('Error saving registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to save registry');
		} finally {
			isLoadingAction = false;
		}
	}

	function confirmRemoveRegistry(registry: ContainerRegistry) {
		openConfirmDialog({
			title: 'Remove Registry',
			message: `Are you sure you want to remove the registry "${registry.url}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					if (registry.id) {
						await removeRegistry(registry.id);
					}
				}
			}
		});
	}

	async function removeRegistry(id: string) {
		isLoadingAction = true;

		try {
			await containerRegistryAPI.deleteRegistry(id);
			toast.success('Registry removed successfully');
			await loadRegistries();
		} catch (error) {
			console.error('Error removing registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to remove registry');
		} finally {
			isLoadingAction = false;
		}
	}

	async function testRegistry(id: string, url: string) {
		isLoadingAction = true;

		try {
			const result = await containerRegistryAPI.testRegistry(id);
			toast.success(`Registry test passed: ${result.message}`);
		} catch (error) {
			console.error('Error testing registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to test registry');
		} finally {
			isLoadingAction = false;
		}
	}
</script>

<svelte:head>
	<title>Container Registries - Arcane</title>
</svelte:head>

<ContainerRegistryFormSheet bind:open={isRegistryDialogOpen} bind:registryToEdit onSubmit={handleRegistryDialogSubmit} isLoading={isLoadingAction} />

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Container Registries</h1>
			<p class="text-muted-foreground mt-1 text-sm">Configure access credentials for private Docker registries and container repositories</p>
		</div>

		<div class="flex gap-2">
			<Button onclick={loadRegistries} disabled={isLoadingAction} variant="outline" class="h-10">
				<RefreshCw class="size-4" />
				Refresh
			</Button>
			<Button onclick={openCreateRegistryDialog} disabled={isLoadingAction} class="arcane-button-save h-10">
				{#if isLoadingAction}
					<RefreshCw class="size-4 animate-spin" />
					Processing...
				{:else}
					<Plus class="size-4" />
					Add Registry
				{/if}
			</Button>
		</div>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-green-500/10 p-2">
					<Key class="size-5 text-green-500" />
				</div>
				<div>
					<Card.Title>Docker Registry Credentials</Card.Title>
					<Card.Description>Manage authentication credentials for private Docker registries like Docker Hub, GitHub Container Registry, Google Container Registry, and custom registries</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if !registries || registries.length === 0}
				<div class="py-12 text-center">
					<div class="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
						<Key class="text-muted-foreground size-8" />
					</div>
					<h3 class="mb-2 text-lg font-medium">No Registry Credentials</h3>
					<p class="text-muted-foreground mx-auto mb-4 max-w-sm text-sm">Add registry credentials to authenticate with private Docker registries when pulling images.</p>
					<Button onclick={openCreateRegistryDialog} class="arcane-button-save">
						<Plus class="size-4" />
						Add Your First Registry
					</Button>
				</div>
			{:else}
				<UniversalTable
					data={registries}
					columns={[
						{ accessorKey: 'url', header: 'Registry URL' },
						{ accessorKey: 'username', header: 'Username' },
						{ accessorKey: 'description', header: 'Description' },
						{ accessorKey: 'enabled', header: 'Status' },
						{ accessorKey: 'actions', header: 'Actions', enableSorting: false }
					]}
					features={{
						sorting: true,
						filtering: true,
						selection: false
					}}
					pagination={{
						pageSize: 10,
						pageSizeOptions: [5, 10, 20]
					}}
					sort={{
						defaultSort: { id: 'url', desc: false }
					}}
					display={{
						noResultsMessage: 'No registry credentials found.',
						filterPlaceholder: 'Search registries...'
					}}
				>
					{#snippet rows({ item, index })}
						{#if typeof index === 'number'}
							<Table.Cell class="font-medium">
								<div class="flex flex-col">
									<span class="font-medium">
										{item.url || 'docker.io (Docker Hub)'}
									</span>
									{#if item.url && (item.url.includes('ghcr.io') || item.url.includes('gcr.io') || item.url.includes('quay.io'))}
										<span class="text-muted-foreground text-xs">
											{#if item.url.includes('ghcr.io')}
												GitHub Container Registry
											{:else if item.url.includes('gcr.io')}
												Google Container Registry
											{:else if item.url.includes('quay.io')}
												Quay.io Registry
											{/if}
										</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<span class="font-mono text-sm">{item.username || '-'}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<span class="text-muted-foreground text-sm">
									{item.description || 'No description provided'}
								</span>
							</Table.Cell>
							<Table.Cell>
								<span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
									{item.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</Table.Cell>
							<Table.Cell class="text-right">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Button variant="ghost" size="icon" class="size-8">
											<Ellipsis class="size-4" />
											<span class="sr-only">Open menu</span>
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										{#if item.id}
											<DropdownMenu.Item onclick={() => testRegistry(item.id!, item.url)}>
												<TestTube class="mr-2 size-4" />
												Test Connection
											</DropdownMenu.Item>
										{/if}
										<DropdownMenu.Item onclick={() => openEditRegistryDialog(item)}>
											<Pencil class="mr-2 size-4" />
											Edit
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => confirmRemoveRegistry(item)} class="focus:bg-destructive/10 text-red-500 focus:text-red-700!">
											<Trash2 class="mr-2 size-4" />
											Remove
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						{/if}
					{/snippet}
				</UniversalTable>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Registry Information Card -->
	<Card.Root class="border shadow-sm">
		<Card.Header>
			<Card.Title class="text-lg">Registry Information</Card.Title>
			<Card.Description>Common registry URLs and authentication requirements</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-3">
					<h4 class="text-sm font-medium">Popular Public Registries</h4>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Docker Hub:</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">docker.io</code>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">GitHub:</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">ghcr.io</code>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Google:</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">gcr.io</code>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Quay.io:</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">quay.io</code>
						</div>
					</div>
				</div>
				<div class="space-y-3">
					<h4 class="text-sm font-medium">Authentication Notes</h4>
					<div class="text-muted-foreground space-y-1 text-sm">
						<p>• Docker Hub requires credentials for private repositories</p>
						<p>• GitHub uses personal access tokens as passwords</p>
						<p>• Some registries support anonymous access for public images</p>
						<p>• Credentials are encrypted and stored securely</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
