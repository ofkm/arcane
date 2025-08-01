<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, Activity, Ellipsis } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { eventAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { Event } from '$lib/types/event.type';

	let {
		events,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onEventsChanged
	}: {
		events: Paginated<Event>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<any>;
		onEventsChanged: () => Promise<void>;
	} = $props();

	let isLoading = $state({
		removing: false
	});

	type EventWithId = Event & { id: string };

	const eventsWithId = $derived(
		(events.data || []).map((event) => ({
			...event,
			id: event.id
		}))
	);

	const paginatedEvents: Paginated<EventWithId> = $derived({
		data: eventsWithId as EventWithId[],
		pagination: events.pagination
	});

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: `Delete ${selectedIds.length} Event${selectedIds.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to delete the selected event${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const eventId of selectedIds) {
						const result = await tryCatch(eventAPI.delete(eventId));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to delete event ${eventId}`,
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});

						if (result.error) {
							failureCount++;
						}
					}

					isLoading.removing = false;

					if (successCount > 0) {
						toast.success(
							`Successfully deleted ${successCount} event${successCount > 1 ? 's' : ''}`
						);
						await onEventsChanged();
					}

					if (failureCount > 0) {
						toast.error(`Failed to delete ${failureCount} event${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function handleDeleteEvent(eventId: string, title: string) {
		openConfirmDialog({
			title: `Delete Event`,
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
							await onEventsChanged();
						}
					});
				}
			}
		});
	}

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
</script>

{#if eventsWithId.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<Card.Title>Events List</Card.Title>
				<div class="flex items-center gap-2">
					{#if selectedIds.length > 0}
						<ArcaneButton
							action="remove"
							onClick={handleDeleteSelected}
							loading={isLoading.removing}
							disabled={isLoading.removing}
						/>
					{/if}
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={paginatedEvents}
				bind:requestOptions
				bind:selectedIds
				{onRefresh}
				columns={[
					{ label: 'Severity', sortColumn: 'severity' },
					{ label: 'Type', sortColumn: 'type' },
					{ label: 'Resource', sortColumn: 'resourceType' },
					{ label: 'User', sortColumn: 'username' },
					{ label: 'Time', sortColumn: 'timestamp' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search events..."
				noResultsMessage="No events found"
			>
				{#snippet rows({ item })}
					<Table.Cell>
						<StatusBadge text={item.severity} variant={getSeverityBadgeVariant(item.severity)} />
					</Table.Cell>
					<Table.Cell>
						<Badge variant="outline">{item.type}</Badge>
					</Table.Cell>
					<Table.Cell>
						{#if item.resourceType}
							<div class="space-y-1">
								<span class="text-sm">{item.resourceType}</span>
								{#if item.resourceName}
									<p class="text-xs text-muted-foreground">{item.resourceName}</p>
								{/if}
							</div>
						{:else}
							-
						{/if}
					</Table.Cell>
					<Table.Cell>{item.username || '-'}</Table.Cell>
					<Table.Cell>
						<span class="text-sm">{formatTimestamp(item.timestamp)}</span>
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
										variant="destructive"
										onclick={() => handleDeleteEvent(item.id, item.title)}
									>
										<Trash2 class="size-4" />
										Delete
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
		<Activity class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No events found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">
			Events will appear here as they are generated by system activities
		</p>
	</div>
{/if}
