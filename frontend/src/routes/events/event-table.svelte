<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { formatDistanceToNow } from 'date-fns';
	import { eventAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { Event } from '$lib/types/event.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';

	let {
		events = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		events: Paginated<Event>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
	} = $props();

	let isLoading = $state({ removing: false });

	function getSeverityBadgeVariant(severity: string) {
		switch (severity) {
			case 'success':
				return 'green';
			case 'error':
				return 'red';
			case 'warning':
				return 'amber';
			case 'info':
			default:
				return 'blue';
		}
	}

	function formatTimestamp(timestamp: string) {
		const date = new Date(timestamp);
		return formatDistanceToNow(date, { addSuffix: true });
	}

	async function handleDeleteEvent(eventId: string, title: string) {
		openConfirmDialog({
			title: 'Delete Event',
			message: `Are you sure you want to delete the event "${title}"? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					handleApiResultWithCallbacks({
						result: await tryCatch(eventAPI.delete(eventId)),
						message: `Failed to delete event "${title}"`,
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(`Event "${title}" deleted successfully.`);
							events = await eventAPI.listPaginated(
								requestOptions.pagination,
								requestOptions.sort,
								requestOptions.search,
								requestOptions.filters
							);
						}
					});
				}
			}
		});
	}

	const columns = [
		{
			accessorKey: 'severity',
			title: 'Severity',
			sortable: true,
			cell: SeverityCell
		},
		{
			accessorKey: 'type',
			title: 'Type',
			sortable: true,
			cell: TypeCell
		},
		{
			id: 'resource',
			title: 'Resource',
			cell: ResourceCell
		},
		{
			accessorKey: 'username',
			title: 'User',
			sortable: true,
			cell: UserCell
		},
		{
			accessorKey: 'timestamp',
			title: 'Time',
			sortable: true,
			cell: TimeCell
		}
	] satisfies ColumnSpec<Event>[];
</script>

{#snippet SeverityCell({ value }: { value: unknown })}
	<StatusBadge text={String(value ?? '')} variant={getSeverityBadgeVariant(String(value ?? 'info'))} />
{/snippet}

{#snippet TypeCell({ value }: { value: unknown })}
	<Badge variant="outline">{String(value ?? '-')}</Badge>
{/snippet}

{#snippet ResourceCell({ item }: { item: Event })}
	{#if item.resourceType}
		<div class="space-y-1">
			<span class="text-sm">{item.resourceType}</span>
			{#if item.resourceName}
				<p class="text-muted-foreground text-xs">{item.resourceName}</p>
			{/if}
		</div>
	{:else}
		-
	{/if}
{/snippet}

{#snippet UserCell({ value }: { value: unknown })}
	{#if String(value ?? '') === 'System'}
		<span class="text-red-500/50">{String(value ?? '-')}</span>
	{:else}
		{String(value ?? '-')}
	{/if}
{/snippet}

{#snippet TimeCell({ value }: { value: unknown })}
	<span class="text-sm">{formatTimestamp(String(value ?? new Date().toISOString()))}</span>
{/snippet}

{#snippet RowActions({ item }: { item: Event })}
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
				<DropdownMenu.Item
					variant="destructive"
					onclick={() => handleDeleteEvent(item.id, item.title)}
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
				items={events}
				bind:requestOptions
				bind:selectedIds
				onRefresh={async (options) =>
					(events = await eventAPI.listPaginated(options.pagination, options.sort, options.search, options.filters))}
				{columns}
				rowActions={RowActions}
			/>
		</Card.Content>
	</Card.Root>
</div>
