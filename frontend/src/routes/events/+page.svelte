<script lang="ts">
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { PageData } from './$types';
	import StatCard from '$lib/components/stat-card.svelte';
	import type { Event } from '$lib/types/event.type';
	import { eventAPI } from '$lib/services/api';
	import EventTable from './event-table.svelte';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';

	let { data }: { data: PageData } = $props();

	let events = $state(data.events);
	let selectedIds = $state<string[]>([]);
	let requestOptions = $state(data.eventRequestOptions);

	let isLoading = $state({
		refreshing: false,
		deleting: false
	});

	const infoEvents = $derived(events?.data?.filter((e: Event) => e.severity === 'info').length || 0);
	const warningEvents = $derived(events?.data?.filter((e: Event) => e.severity === 'warning').length || 0);
	const errorEvents = $derived(events?.data?.filter((e: Event) => e.severity === 'error').length || 0);
	const successEvents = $derived(events?.data?.filter((e: Event) => e.severity === 'success').length || 0);
	const totalEvents = $derived(events?.pagination?.totalItems || 0);

	async function refreshEvents() {
		isLoading.refreshing = true;
		try {
			events = await eventAPI.getEvents(requestOptions);
		} catch (error) {
			console.error('Failed to refresh events:', error);
			toast.error('Failed to refresh events');
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: `Delete ${selectedIds.length} Event${selectedIds.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to delete the selected event${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.deleting = true;
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

						if (result.error) failureCount++;
					}

					isLoading.deleting = false;

					if (successCount > 0) {
						toast.success(`Successfully deleted ${successCount} event${successCount > 1 ? 's' : ''}`);
						await refreshEvents();
					}
					if (failureCount > 0) {
						toast.error(`Failed to delete ${failureCount} event${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
			}
		});
	}
</script>

<div class="flex h-full flex-col space-y-6">
	<div class="flex items-center justify-between">
		<div class="space-y-1">
			<h2 class="text-2xl font-semibold tracking-tight">Event Log</h2>
			<p class="text-muted-foreground text-sm">Monitor events that have taken place in Arcane.</p>
		</div>
		<div class="flex items-center gap-2">
			{#if selectedIds.length > 0}
				<ArcaneButton
					action="remove"
					customLabel="Remove Selected"
					onclick={handleDeleteSelected}
					loading={isLoading.deleting}
					disabled={isLoading.deleting}
				/>
			{/if}
			<ArcaneButton
				action="restart"
				customLabel="Refresh"
				onclick={refreshEvents}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-5">
		<StatCard title="Total Events" value={totalEvents} icon={ActivityIcon} subtitle="All recorded events" />
		<StatCard
			title="Info"
			value={infoEvents}
			icon={ActivityIcon}
			iconColor="text-blue-500"
			bgColor="bg-blue-500/10"
			subtitle="Information events"
		/>
		<StatCard
			title="Success"
			value={successEvents}
			icon={ActivityIcon}
			iconColor="text-green-500"
			bgColor="bg-green-500/10"
			subtitle="Successful operations"
		/>
		<StatCard
			title="Warning"
			value={warningEvents}
			icon={ActivityIcon}
			iconColor="text-yellow-500"
			bgColor="bg-yellow-500/10"
			subtitle="Warning events"
		/>
		<StatCard
			title="Error"
			value={errorEvents}
			icon={ActivityIcon}
			iconColor="text-red-500"
			bgColor="bg-red-500/10"
			subtitle="Error events"
		/>
	</div>

	<div class="flex-1 overflow-hidden">
		<EventTable bind:events bind:selectedIds bind:requestOptions />
	</div>
</div>
