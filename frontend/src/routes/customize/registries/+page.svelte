<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import KeyIcon from '@lucide/svelte/icons/key';
	import { toast } from 'svelte-sonner';
	import type { ContainerRegistry } from '$lib/types/container-registry.type';
	import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/types/container-registry.type';
	import ContainerRegistryFormSheet from '$lib/components/sheets/container-registry-sheet.svelte';
	import RegistryTable from './registry-table.svelte';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { m } from '$lib/paraglide/messages';
	import { containerRegistryService } from '$lib/services/container-registry-service';

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
			result: await tryCatch(containerRegistryService.getRegistries(requestOptions)),
			message: m.registries_refresh_failed(),
			setLoadingState: (value) => (isLoading.refresh = value),
			onSuccess: async (newRegistries) => {
				registries = newRegistries;
				toast.success(m.registries_refreshed());
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
				await containerRegistryService.updateRegistry(registryToEdit.id, registry as ContainerRegistryUpdateDto);
				toast.success(m.registries_update_success());
			} else {
				await containerRegistryService.createRegistry(registry as ContainerRegistryCreateDto);
				toast.success(m.registries_create_success());
			}

			registries = await containerRegistryService.getRegistries(requestOptions);
			isRegistryDialogOpen = false;
		} catch (error) {
			console.error('Error saving registry:', error);
			toast.error(error instanceof Error ? error.message : m.registries_save_failed());
		} finally {
			isLoading[loadingKey] = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{m.registries_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				{m.registries_subtitle()}
			</p>
		</div>
		<div class="hidden items-center gap-2 sm:flex">
			<ArcaneButton action="create" onclick={openCreateRegistryDialog} customLabel={m.registries_add_button()} />
			<ArcaneButton
				action="restart"
				onclick={refreshRegistries}
				customLabel={m.common_refresh()}
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>

		<div class="absolute right-4 top-4 flex items-center sm:hidden">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="bg-background/70 flex inline-flex size-9 items-center justify-center rounded-lg border">
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</DropdownMenu.Trigger>

				<DropdownMenu.Content
					align="end"
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 z-50 min-w-[160px] rounded-md p-1 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm"
				>
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={openCreateRegistryDialog}>
							{m.registries_add_button()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={refreshRegistries} disabled={isLoading.refresh}>
							{m.common_refresh()}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-green-500/10 p-2">
					<KeyIcon class="size-5 text-green-500" />
				</div>
				<div>
					<Card.Title>{m.registries_credentials_title()}</Card.Title>
					<Card.Description>
						{m.registries_credentials_description()}
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
			<Card.Title class="text-lg">{m.registries_info_title()}</Card.Title>
			<Card.Description>{m.registries_info_description()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-3">
					<h4 class="text-sm font-medium">{m.registries_popular_public_title()}</h4>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">{m.registry_docker_hub()}</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">{m.registry_docker_hub_url()}</code>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">{m.registry_github_container_registry()}</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">{m.registry_github_url()}</code>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">{m.registry_google_container_registry()}</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">{m.registry_google_url()}</code>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">{m.registry_quay_io()}</span>
							<code class="bg-muted rounded px-2 py-1 text-xs">{m.registry_quay_url()}</code>
						</div>
					</div>
				</div>
				<div class="space-y-3">
					<h4 class="text-sm font-medium">{m.registries_auth_notes_title()}</h4>
					<div class="text-muted-foreground space-y-1 text-sm">
						<p>• {m.registries_auth_notes_bullet_docker_hub()}</p>
						<p>• {m.registries_auth_notes_bullet_github()}</p>
						<p>• {m.registries_auth_notes_bullet_anonymous()}</p>
						<p>• {m.registries_auth_notes_bullet_encrypted()}</p>
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
