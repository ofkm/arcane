<script lang="ts">
	import { Activity, RefreshCw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { PageData } from './$types';
	import StatCard from '$lib/components/stat-card.svelte';
	import type { Event } from '$lib/types/event.type';
	import { eventAPI } from '$lib/services/api';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import EventTable from './event-table.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data }: { data: PageData } = $props();

	let events = $state<Event[]>(Array.isArray(data.events) ? data.events : data.events?.data || []);
	let selectedIds = $state<string[]>([]);
	let requestOptions = $state<SearchPaginationSortRequest>(data.eventRequestOptions);

	let isLoading = $state({
		refreshing: false,
		deleting: false
	});

	const infoEvents = $derived(events?.filter((e: Event) => e.severity === 'info').length || 0);
	const warningEvents = $derived(
		events?.filter((e: Event) => e.severity === 'warning').length || 0
	);
	const errorEvents = $derived(events?.filter((e: Event) => e.severity === 'error').length || 0);
	const successEvents = $derived(
		events?.filter((e: Event) => e.severity === 'success').length || 0
	);
	const totalEvents = $derived(events?.length || 0);

	async function loadEvents() {
		try {
			isLoading.refreshing = true;
			const response = await eventAPI.getEvents(
				requestOptions.pagination,
				requestOptions.sort,
				requestOptions.search,
				requestOptions.filters
			);
			events = Array.isArray(response) ? response : response.data || [];
		} catch (err) {
			console.error('Failed to load events:', err);
			toast.error('Failed to load events');
			events = [];
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function onRefresh(options: SearchPaginationSortRequest) {
		requestOptions = options;
		await loadEvents();
		return {
			data: events,
			pagination: {
				totalPages: Math.ceil(events.length / (requestOptions.pagination?.limit || 20)),
				totalItems: events.length,
				currentPage: requestOptions.pagination?.page || 1,
				itemsPerPage: requestOptions.pagination?.limit || 20
			}
		};
	}

	async function onEventsChanged() {
		await refreshEvents();
	}

	async function onDeleteOldEvents(days: number) {
		handleApiResultWithCallbacks({
			result: await tryCatch(eventAPI.deleteOldEvents(days)),
			message: `Failed to delete events older than ${days} days`,
			setLoadingState: (value) => (isLoading.deleting = value),
			onSuccess: async () => {
				toast.success(`Successfully deleted events older than ${days} days`);
				await refreshEvents();
			}
		});
	}

	async function refreshEvents() {
		isLoading.refreshing = true;
		try {
			await loadEvents();
		} catch (error) {
			console.error('Failed to refresh events:', error);
			toast.error('Failed to refresh events');
		} finally {
			isLoading.refreshing = false;
		}
	}
</script>

<svelte:head>
	<title>Event Log - Arcane</title>
</svelte:head>

<div class="flex h-full flex-col space-y-6">
	<div class="flex items-center justify-between">
		<div class="space-y-1">
			<h2 class="text-2xl font-semibold tracking-tight">Event Log</h2>
			<p class="text-sm text-muted-foreground">Monitor events that have taken place in Arcane.</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-5">
		<StatCard
			title="Total Events"
			value={totalEvents}
			icon={Activity}
			subtitle="All recorded events"
		/>
		<StatCard
			title="Info"
			value={infoEvents}
			icon={Activity}
			iconColor="text-blue-500"
			bgColor="bg-blue-500/10"
			subtitle="Information events"
		/>
		<StatCard
			title="Success"
			value={successEvents}
			icon={Activity}
			iconColor="text-green-500"
			bgColor="bg-green-500/10"
			subtitle="Successful operations"
		/>
		<StatCard
			title="Warning"
			value={warningEvents}
			icon={Activity}
			iconColor="text-yellow-500"
			bgColor="bg-yellow-500/10"
			subtitle="Warning events"
		/>
		<StatCard
			title="Error"
			value={errorEvents}
			icon={Activity}
			iconColor="text-red-500"
			bgColor="bg-red-500/10"
			subtitle="Error events"
		/>
	</div>

	<!-- Cleanup Actions -->
	<div class="flex items-center justify-between rounded-lg border p-4">
		<div class="space-y-1">
			<h3 class="text-sm font-medium">Event Cleanup</h3>
			<p class="text-xs text-muted-foreground">
				Remove old events to keep your database clean and performant.
			</p>
		</div>
		<div class="flex items-center space-x-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => onDeleteOldEvents(30)}
				loading={isLoading.deleting}
			>
				Delete 30+ days
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => onDeleteOldEvents(7)}
				loading={isLoading.deleting}
			>
				Delete 7+ days
			</Button>
		</div>
	</div>

	<!-- Events Table -->
	<div class="flex-1 overflow-hidden">
		<EventTable {events} bind:selectedIds bind:requestOptions {onRefresh} {onEventsChanged} />
	</div>
</div>
