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
	import { goto } from '$app/navigation';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { toast } from 'svelte-sonner';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { UniversalMobileCard } from '$lib/components/arcane-table';
	import type { Environment } from '$lib/types/environment.type';
	import { m } from '$lib/paraglide/messages';
	import { environmentManagementService } from '$lib/services/env-mgmt-service';
	import CloudIcon from '@lucide/svelte/icons/cloud';

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
			title: m.environments_remove_selected_title({ count: ids.length }),
			message: m.environments_remove_selected_message({ count: ids.length }),
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const id of ids) {
						const result = await tryCatch(environmentManagementService.delete(id));
						handleApiResultWithCallbacks({
							result,
							message: m.common_bulk_remove_failed({ count: ids.length, resource: m.environments_title() }),
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});
						if (result.error) failureCount++;
					}

					isLoading.removing = false;

					if (successCount > 0) {
						const msg = m.common_bulk_remove_success({ count: successCount, resource: m.environments_title() });
						toast.success(msg);
						environments = await environmentManagementService.getEnvironments(requestOptions);
					}
					if (failureCount > 0) {
						const msg = m.common_bulk_remove_failed({ count: failureCount, resource: m.environments_title() });
						toast.error(msg);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function handleDeleteOne(id: string, hostname: string) {
		openConfirmDialog({
			title: m.common_delete_title({ resource: m.resource_environment() }),
			message: m.environments_delete_message({ name: hostname }),
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					const result = await tryCatch(environmentManagementService.delete(id));
					handleApiResultWithCallbacks({
						result,
						message: m.environments_delete_failed({ name: hostname }),
						setLoadingState: () => {},
						onSuccess: async () => {
							toast.success(m.common_delete_success({ resource: `${m.resource_environment()} "${hostname}"` }));
							environments = await environmentManagementService.getEnvironments(requestOptions);
						}
					});
					isLoading.removing = false;
				}
			}
		});
	}

	async function handleTest(id: string) {
		isLoading.testing = true;
		const result = await tryCatch(environmentManagementService.testConnection(id));
		handleApiResultWithCallbacks({
			result,
			message: m.environments_test_connection_failed(),
			setLoadingState: () => {},
			onSuccess: (resp) => {
				const status = (resp as { status: string; message?: string }).status;
				if (status === 'online') toast.success(m.environments_test_connection_success());
				else toast.error(m.environments_test_connection_error());
			}
		});
		isLoading.testing = false;
	}

	const columns = [
		{ accessorKey: 'id', title: m.common_id(), hidden: true },
		{
			id: 'name',
			title: m.common_name(),
			sortable: true,
			accessorFn: (row) => row.name,
			cell: EnvironmentCell
		},
		{
			accessorKey: 'status',
			title: m.common_status(),
			sortable: true,
			cell: StatusCell
		},
		{
			accessorKey: 'enabled',
			title: m.common_enabled(),
			sortable: true,
			cell: EnabledCell
		},
		{
			accessorKey: 'apiUrl',
			title: m.environments_api_url(),
			cell: ApiCell
		}
	] satisfies ColumnSpec<Environment>[];

	const mobileFields = [
		{ id: 'id', label: m.common_id(), defaultVisible: true },
		{ id: 'apiUrl', label: m.environments_api_url(), defaultVisible: true }
	];

	let mobileFieldVisibility = $state<Record<string, boolean>>({});
</script>

{#snippet EnvironmentCell({ item }: { item: Environment })}
	<div class="flex items-center gap-3">
		<div class="relative">
			<div class="bg-muted flex size-8 items-center justify-center rounded-lg">
				<MonitorIcon class="text-muted-foreground size-4" />
			</div>
			<div
				class="border-background absolute -top-1 -right-1 size-3 rounded-full border-2 {item.status === 'online'
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
	<StatusBadge text={String(value ?? m.common_offline())} variant={String(value) === 'online' ? 'green' : 'red'} />
{/snippet}

{#snippet ApiCell({ value }: { value: unknown })}
	<span class="text-muted-foreground font-mono text-sm">{String(value ?? '')}</span>
{/snippet}

{#snippet EnabledCell({ value }: { value: unknown })}
	<StatusBadge text={Boolean(value) ? 'Enabled' : 'Disabled'} variant={Boolean(value) ? 'green' : 'gray'} />
{/snippet}

{#snippet EnvironmentMobileCardSnippet({
	row,
	item,
	mobileFieldVisibility
}: {
	row: any;
	item: Environment;
	mobileFieldVisibility: Record<string, boolean>;
})}
	<UniversalMobileCard
		{item}
		icon={{ component: CloudIcon, variant: 'emerald' }}
		title={(item: Environment) => item.name || item.id}
		subtitle={(item: Environment) => ((mobileFieldVisibility.id ?? true) ? item.id : null)}
		badges={[{ variant: 'green', text: m.sidebar_environment_label() }]}
		fields={[
			{
				label: m.environments_api_url(),
				getValue: (item: Environment) => item.apiUrl,
				icon: CloudIcon,
				iconVariant: 'gray' as const,
				show: (mobileFieldVisibility.apiUrl ?? true) && !!item.apiUrl
			}
		]}
		rowActions={RowActions}
	/>
{/snippet}

{#snippet RowActions({ item }: { item: Environment })}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => handleTest(item.id)} disabled={isLoading.testing}>
					<TerminalIcon class="size-4" />
					{m.environments_test_connection()}
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => goto(`/environments/${item.id}`)}>
					<EyeIcon class="size-4" />
					{m.common_view_details()}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item
					variant="destructive"
					onclick={() => handleDeleteOne(item.id, item.name)}
					disabled={isLoading.removing}
				>
					<Trash2Icon class="size-4" />
					{m.common_delete()}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<ArcaneTable
	persistKey="arcane-environments-table"
	items={environments}
	bind:requestOptions
	bind:selectedIds
	bind:mobileFieldVisibility
	onRemoveSelected={(ids) => handleDeleteSelected(ids)}
	onRefresh={async (options) => (environments = await environmentManagementService.getEnvironments(options))}
	{columns}
	{mobileFields}
	rowActions={RowActions}
	mobileCard={EnvironmentMobileCardSnippet}
/>
