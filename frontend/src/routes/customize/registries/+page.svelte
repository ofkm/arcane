<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import KeyIcon from '@lucide/svelte/icons/key';
	import { toast } from 'svelte-sonner';
	import type { ContainerRegistry } from '$lib/types/container-registry.type';
	import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/types/container-registry.type';
	import { containerRegistryAPI } from '$lib/services/api';
	import ContainerRegistryFormSheet from '$lib/components/sheets/container-registry-sheet.svelte';
	import RegistryTable from './registry-table.svelte';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';

	let { data } = $props();

	let registries = $state(data.registries);
	let selectedIds = $state<string[]>([]);
	let isRegistryDialogOpen = $state(false);
	let registryToEdit = $state<ContainerRegistry | null>(null);
	let requestOptions = $state(data.registryRequestOptions);

	let isLoading = $state({
		create: false,
		edit: false,
		refresh: false
	});

	async function refreshRegistries() {
		isLoading.refresh = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(containerRegistryAPI.getRegistries(requestOptions)),
			message: 'Failed to Refresh Registries',
			setLoadingState: (value) => (isLoading.refresh = value),
			onSuccess: async (newRegistries) => {
				registries = newRegistries;
				toast.success('Registries Refreshed!');
			}
		});
	}

	function openCreateRegistryDialog() {
		registryToEdit = null;
		isRegistryDialogOpen = true;
	}

	function openEditRegistryDialog(registry: ContainerRegistry) {
		registryToEdit = registry;
		isRegistryDialogOpen = true;
	}

	async function handleRegistryDialogSubmit(detail: {
		registry: ContainerRegistryCreateDto | ContainerRegistryUpdateDto;
		isEditMode: boolean;
	}) {
		const { registry, isEditMode } = detail;
		const loadingKey = isEditMode ? 'edit' : 'create';
		isLoading[loadingKey] = true;

		try {
			if (isEditMode && registryToEdit?.id) {
				await containerRegistryAPI.updateRegistry(registryToEdit.id, registry as ContainerRegistryUpdateDto);
				toast.success('Registry updated successfully');
			} else {
				await containerRegistryAPI.createRegistry(registry as ContainerRegistryCreateDto);
				toast.success('Registry created successfully');
			}

			registries = await containerRegistryAPI.getRegistries(requestOptions);
			isRegistryDialogOpen = false;
		} catch (error) {
			console.error('Error saving registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to save registry');
		} finally {
			isLoading[loadingKey] = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Container Registries</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Configure access credentials for private Docker registries and container repositories
			</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton action="create" onclick={openCreateRegistryDialog} customLabel="Add Registry" />
			<ArcaneButton
				action="restart"
				onclick={refreshRegistries}
				customLabel="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-green-500/10 p-2">
					<KeyIcon class="size-5 text-green-500" />
				</div>
				<div>
					<Card.Title>Docker Registry Credentials</Card.Title>
					<Card.Description>
						Manage authentication credentials for private Docker registries like Docker Hub, GitHub Container Registry, Google
						Container Registry, and custom registries
					</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<RegistryTable bind:registries bind:selectedIds bind:requestOptions onEditRegistry={openEditRegistryDialog} />
		</Card.Content>
	</Card.Root>

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

<ContainerRegistryFormSheet
	bind:open={isRegistryDialogOpen}
	bind:registryToEdit
	onSubmit={handleRegistryDialogSubmit}
	isLoading={isLoading.create || isLoading.edit}
/>
