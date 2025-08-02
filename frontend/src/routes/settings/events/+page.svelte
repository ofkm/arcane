<script lang="ts">
	import { Activity, RefreshCw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { PageData } from './$types';
	import StatCard from '$lib/components/stat-card.svelte';
	import type { Event } from '$lib/types/event.type';
	import { eventAPI } from '$lib/services/api';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import EventTable from './event-table.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		DropdownButton,
		type DropdownButtonOption
	} from '$lib/components/ui/dropdown-button/index.js';

	let { data }: { data: PageData } = $props();

	let events = $state<Paginated<Event>>(data.events);
	let selectedIds = $state<string[]>([]);
	let requestOptions = $state<SearchPaginationSortRequest>(data.eventRequestOptions);

	let isLoading = $state({
		refreshing: false,
		deleting: false
	});

	const infoEvents = $derived(
		events?.data?.filter((e: Event) => e.severity === 'info').length || 0
	);
	const warningEvents = $derived(
		events?.data?.filter((e: Event) => e.severity === 'warning').length || 0
	);
	const errorEvents = $derived(
		events?.data?.filter((e: Event) => e.severity === 'error').length || 0
	);
	const successEvents = $derived(
		events?.data?.filter((e: Event) => e.severity === 'success').length || 0
	);
	const totalEvents = $derived(events?.pagination?.totalItems || 0);

	async function loadEvents() {
		try {
			isLoading.refreshing = true;
			const response = await eventAPI.listPaginated(
				requestOptions.pagination,
				requestOptions.sort,
				requestOptions.search,
				requestOptions.filters
			);
			events = response;
		} catch (err) {
			console.error('Failed to load events:', err);
			toast.error('Failed to load events');
			events = {
				data: [],
				pagination: {
					totalPages: 0,
					totalItems: 0,
					currentPage: 1,
					itemsPerPage: 20
				}
			};
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function onRefresh(options: SearchPaginationSortRequest) {
		requestOptions = options;
		await loadEvents();
		return events;
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

	const clearButtonOptions: DropdownButtonOption[] = [
		{
			label: 'Today',
			value: '1',
			onclick: () => onDeleteOldEvents(1)
		},
		{
			label: '7 Days',
			value: '7',
			onclick: () => onDeleteOldEvents(7)
		},
		{
			label: '30 Days',
			value: '30',
			onclick: () => onDeleteOldEvents(30)
		}
	];
</script>

<div class="flex h-full flex-col space-y-6">
	<div class="flex items-center justify-between">
		<div class="space-y-1">
			<h2 class="text-2xl font-semibold tracking-tight">Event Log</h2>
			<p class="text-sm text-muted-foreground">Monitor events that have taken place in Arcane.</p>
		</div>
		<div class="flex items-center gap-2">
			<DropdownButton
				mainButtonText="Clear Events"
				options={clearButtonOptions}
				variant="outline"
			/>
		</div>
	</div>

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

	<div class="flex-1 overflow-hidden">
		<EventTable {events} bind:selectedIds bind:requestOptions {onRefresh} {onEventsChanged} />
	</div>
</div>
