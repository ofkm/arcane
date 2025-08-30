<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TestTubeIcon from '@lucide/svelte/icons/test-tube';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { containerRegistryAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { ContainerRegistry } from '$lib/types/container-registry.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { format } from 'date-fns';

	let {
		registries = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onEditRegistry
	}: {
		registries: Paginated<ContainerRegistry>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onEditRegistry: (registry: ContainerRegistry) => void;
	} = $props();

	let isLoading = $state({
		removing: false,
		testing: false
	});

	function getRegistryDisplayName(url: string) {
		if (!url || url === 'docker.io') return 'Docker Hub';
		if (url.includes('ghcr.io')) return 'GitHub Container Registry';
		if (url.includes('gcr.io')) return 'Google Container Registry';
		if (url.includes('quay.io')) return 'Quay.io Registry';
		return url;
	}

	async function handleDeleteSelected(ids: string[]) {
		if (!ids?.length) return;

		openConfirmDialog({
			title: `Remove ${ids.length} Registr${ids.length === 1 ? 'y' : 'ies'}`,
			message: `Are you sure you want to remove the selected registr${ids.length === 1 ? 'y' : 'ies'}? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;

					let successCount = 0;
					let failureCount = 0;
					for (const id of ids) {
						const reg = registries.data.find((r) => r.id === id);
						const result = await tryCatch(containerRegistryAPI.deleteRegistry(id));
						if (result.error) {
							failureCount++;
							toast.error(`Failed to delete registry "${reg?.url ?? id}"`);
						} else {
							successCount++;
						}
					}

					if (successCount > 0) {
						toast.success(`Removed ${successCount} registr${successCount === 1 ? 'y' : 'ies'}`);
						registries = await containerRegistryAPI.getRegistries(requestOptions);
					}
					if (failureCount > 0) toast.error(`Failed to remove ${failureCount}`);

					selectedIds = [];
					isLoading.removing = false;
				}
			}
		});
	}

	async function handleDeleteOne(id: string, url: string) {
		openConfirmDialog({
			title: 'Remove Registry',
			message: `Are you sure you want to remove the registry "${url}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;

					const result = await tryCatch(containerRegistryAPI.deleteRegistry(id));
					handleApiResultWithCallbacks({
						result,
						message: `Failed to remove registry "${url}"`,
						setLoadingState: () => {},
						onSuccess: async () => {
							toast.success(`Registry "${url}" removed successfully.`);
							registries = await containerRegistryAPI.getRegistries(requestOptions);
						}
					});

					isLoading.removing = false;
				}
			}
		});
	}

	async function handleTest(id: string, url: string) {
		isLoading.testing = true;
		const result = await tryCatch(containerRegistryAPI.testRegistry(id));
		handleApiResultWithCallbacks({
			result,
			message: `Failed to test registry "${url}"`,
			setLoadingState: () => {},
			onSuccess: (resp) => {
				const msg = (resp as any)?.message || 'Connection successful';
				toast.success(`Registry test passed: ${msg}`);
			}
		});
		isLoading.testing = false;
	}

	const columns = [
		{ accessorKey: 'id', title: 'ID', hidden: true },
		{
			accessorKey: 'url',
			title: 'Registry URL',
			sortable: true,
			cell: UrlCell
		},
		{
			accessorKey: 'username',
			title: 'Username',
			sortable: true,
			cell: UsernameCell
		},
		{
			accessorKey: 'description',
			title: 'Description',
			sortable: true,
			cell: DescriptionCell
		},
		{
			accessorKey: 'enabled',
			title: 'Status',
			sortable: true,
			cell: StatusCell
		},
		{
			accessorKey: 'createdAt',
			title: 'Created',
			sortable: true,
			cell: CreatedCell
		}
	] satisfies ColumnSpec<ContainerRegistry>[];
</script>

{#snippet UrlCell({ item }: { item: ContainerRegistry })}
	<div class="flex flex-col">
		<span class="font-medium">{item.url || 'docker.io'}</span>
		<span class="text-muted-foreground text-xs">{getRegistryDisplayName(item.url)}</span>
	</div>
{/snippet}

{#snippet UsernameCell({ value }: { value: unknown })}
	<span class="font-mono text-sm">{(value as string) || '-'}</span>
{/snippet}

{#snippet DescriptionCell({ value }: { value: unknown })}
	<span class="text-muted-foreground text-sm">{(value as string) || 'No description provided'}</span>
{/snippet}

{#snippet StatusCell({ value }: { value: unknown })}
	{@const enabled = Boolean(value)}
	<span
		class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {enabled
			? 'bg-green-100 text-green-800'
			: 'bg-gray-100 text-gray-800'}"
	>
		{enabled ? 'Enabled' : 'Disabled'}
	</span>
{/snippet}

{#snippet CreatedCell({ value }: { value: unknown })}
	<span class="text-sm">{value ? format(new Date(String(value)), 'PP p') : 'N/A'}</span>
{/snippet}

{#snippet RowActions({ item }: { item: ContainerRegistry })}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">Open menu</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => handleTest(item.id, item.url)} disabled={isLoading.testing}>
					<TestTubeIcon class="size-4" />
					Test Connection
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onEditRegistry(item)}>
					<PencilIcon class="size-4" />
					Edit
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="focus:text-red-700! text-red-500"
					onclick={() => handleDeleteOne(item.id, item.url)}
					disabled={isLoading.removing}
				>
					<Trash2Icon class="size-4" />
					Remove
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<div>
	<ArcaneTable
		items={registries}
		bind:requestOptions
		bind:selectedIds
		onRemoveSelected={(ids) => handleDeleteSelected(ids)}
		onRefresh={async (options) => (registries = await containerRegistryAPI.getRegistries(options))}
		{columns}
		rowActions={RowActions}
	/>
</div>
