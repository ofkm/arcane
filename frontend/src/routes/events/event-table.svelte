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
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { Event } from '$lib/types/event.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import EventDetailsDialog from '$lib/components/dialogs/event-details-dialog.svelte';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { m } from '$lib/paraglide/messages';
	import { eventService } from '$lib/services/event-service';

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
	let detailsOpen = $state(false);
	let detailsEvent = $state<Event | null>(null);

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
		const safeTitle = title?.trim() || m.common_unknown();
		openConfirmDialog({
			title: m.events_delete_title(),
			message: m.events_delete_confirm_message({ title: safeTitle }),
			confirm: {
				label: m.common_delete(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					handleApiResultWithCallbacks({
						result: await tryCatch(eventService.delete(eventId)),
						message: m.events_delete_failed({ title: safeTitle }),
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(m.events_delete_success({ title: safeTitle }));
							events = await eventService.getEvents(requestOptions);
						}
					});
				}
			}
		});
	}

	function openDetails(e: Event) {
		detailsEvent = e;
		detailsOpen = true;
	}

	const columns = [
		{
			accessorKey: 'severity',
			title: m.events_col_severity(),
			sortable: true,
			cell: SeverityCell
		},
		{
			accessorKey: 'type',
			title: m.events_col_type(),
			sortable: true,
			cell: TypeCell
		},
		{
			id: 'resource',
			title: m.events_col_resource(),
			cell: ResourceCell
		},
		{
			accessorKey: 'username',
			title: m.common_user(),
			sortable: true,
			cell: UserCell
		},
		{
			accessorKey: 'timestamp',
			title: m.events_col_time(),
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
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => openDetails(item)}>
					<InfoIcon class="size-4" />
					{m.common_view_details()}
				</DropdownMenu.Item>
				<DropdownMenu.Item
					variant="destructive"
					onclick={() => handleDeleteEvent(item.id, item.title)}
					disabled={isLoading.removing}
				>
					<Trash2Icon class="size-4" />
					{m.common_delete()}
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
				onRefresh={async (options) => (events = await eventService.getEvents(options))}
				{columns}
				rowActions={RowActions}
			/>
		</Card.Content>
	</Card.Root>
</div>

<EventDetailsDialog bind:open={detailsOpen} event={detailsEvent} />
