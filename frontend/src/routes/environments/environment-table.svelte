<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { toast } from 'svelte-sonner';
	import { environmentManagementAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import type { Environment } from '$lib/types/environment.type';

	let {
		environments = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		environments: Paginated<Environment>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
	} = $props();

	let isLoading = $state({ removing: false, testing: false });

	async function handleDeleteSelected(ids: string[]) {
		if (!ids?.length) return;

		openConfirmDialog({
			title: `Remove ${ids.length} Environment${ids.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to remove the selected environment${ids.length > 1 ? 's' : ''}? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const id of ids) {
						const result = await tryCatch(environmentManagementAPI.delete(id));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to remove environment`,
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});
						if (result.error) failureCount++;
					}

					isLoading.removing = false;

					if (successCount > 0) {
						toast.success(`Removed ${successCount} environment${successCount > 1 ? 's' : ''}`);
						environments = await environmentManagementAPI.getEnvironments(requestOptions);
					}
					if (failureCount > 0) {
						toast.error(`Failed to remove ${failureCount} environment${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function handleDeleteOne(id: string, hostname: string) {
		openConfirmDialog({
			title: 'Remove Environment',
			message: `Are you sure you want to remove "${hostname}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					const result = await tryCatch(environmentManagementAPI.delete(id));
					handleApiResultWithCallbacks({
						result,
						message: `Failed to remove environment "${hostname}"`,
						setLoadingState: () => {},
						onSuccess: async () => {
							toast.success(`Removed "${hostname}"`);
							environments = await environmentManagementAPI.getEnvironments(requestOptions);
						}
					});
					isLoading.removing = false;
				}
			}
		});
	}

	async function handleTest(id: string) {
		isLoading.testing = true;
		const result = await tryCatch(environmentManagementAPI.testConnection(id));
		handleApiResultWithCallbacks({
			result,
			message: 'Failed to test connection',
			setLoadingState: () => {},
			onSuccess: (resp) => {
				const status = (resp as { status: string; message?: string }).status;
				if (status === 'online') toast.success('Connection successful');
				else toast.error('Connection failed');
			}
		});
		isLoading.testing = false;
	}

	const columns = [
		{ accessorKey: 'id', title: 'ID', hidden: true },
		{
			id: 'name',
			title: 'Friendly Name',
			sortable: true,
			accessorFn: (row) => row.name,
			cell: EnvironmentCell
		},
		{
			accessorKey: 'status',
			title: 'Status',
			sortable: true,
			cell: StatusCell
		},
		{
			accessorKey: 'apiUrl',
			title: 'API URL',
			cell: ApiCell
		},
		{
			accessorKey: 'enabled',
			title: 'Enabled',
			sortable: true,
			cell: EnabledCell
		}
	] satisfies ColumnSpec<Environment>[];
</script>

{#snippet EnvironmentCell({ item }: { item: Environment })}
	<div class="flex items-center gap-3">
		<div class="relative">
			<div class="bg-muted flex size-8 items-center justify-center rounded-lg">
				<MonitorIcon class="text-muted-foreground size-4" />
			</div>
			<div
				class="border-background absolute -right-1 -top-1 size-3 rounded-full border-2 {item.status === 'online'
					? 'bg-green-500'
					: 'bg-red-500'}"
			></div>
		</div>
		<div>
			<div class="font-medium">{item.name}</div>
			<div class="text-muted-foreground font-mono text-xs">{item.id}</div>
		</div>
	</div>
{/snippet}

{#snippet StatusCell({ value }: { value: unknown })}
	<StatusBadge text={String(value ?? 'offline')} variant={String(value) === 'online' ? 'green' : 'red'} />
{/snippet}

{#snippet ApiCell({ value }: { value: unknown })}
	<span class="text-muted-foreground font-mono text-sm">{String(value ?? '')}</span>
{/snippet}

{#snippet EnabledCell({ value }: { value: unknown })}
	<StatusBadge text={Boolean(value) ? 'Enabled' : 'Disabled'} variant={Boolean(value) ? 'green' : 'gray'} />
{/snippet}

{#snippet RowActions({ item }: { item: Environment })}
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
				<DropdownMenu.Item onclick={() => handleTest(item.id)} disabled={isLoading.testing}>
					<TerminalIcon class="size-4" />
					Test Connection
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => goto(`/environments/${item.id}`)}>
					<EyeIcon class="size-4" />
					View Details
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item
					variant="destructive"
					onclick={() => handleDeleteOne(item.id, item.name)}
					disabled={isLoading.removing}
				>
					<Trash2Icon class="size-4" />
					Delete
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<div>
	<Card.Root>
		<Card.Content class="py-5">
			<ArcaneTable
				items={environments}
				bind:requestOptions
				bind:selectedIds
				onRemoveSelected={(ids) => handleDeleteSelected(ids)}
				onRefresh={async (options) => (environments = await environmentManagementAPI.getEnvironments(options))}
				{columns}
				rowActions={RowActions}
			/>
		</Card.Content>
	</Card.Root>
</div>
