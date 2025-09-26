<script lang="ts">
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import type { PageData } from './$types';
	import StatCard from '$lib/components/stat-card.svelte';
	import type { Event } from '$lib/types/event.type';
	import EventTable from './event-table.svelte';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { m } from '$lib/paraglide/messages';
	import { eventService } from '$lib/services/event-service';

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
			events = await eventService.getEvents(requestOptions);
		} catch (error) {
			console.error('Failed to refresh events:', error);
			toast.error(m.events_refresh_failed());
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: m.events_delete_selected_title({ count: selectedIds.length }),
			message: m.events_delete_selected_message({ count: selectedIds.length }),
			confirm: {
				label: m.common_delete(),
				destructive: true,
				action: async () => {
					isLoading.deleting = true;
					let successCount = 0;
					let failureCount = 0;

					for (const eventId of selectedIds) {
						const result = await tryCatch(eventService.delete(eventId));
						handleApiResultWithCallbacks({
							result,
							message: m.events_delete_item_failed({ id: eventId }),
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});

						if (result.error) failureCount++;
					}

					isLoading.deleting = false;

					if (successCount > 0) {
						const msg =
							successCount === 1 ? m.events_delete_success_one() : m.events_delete_success_many({ count: successCount });
						toast.success(msg);
						await refreshEvents();
					}
					if (failureCount > 0) {
						const msg = failureCount === 1 ? m.events_delete_failed_one() : m.events_delete_failed_many({ count: failureCount });
						toast.error(msg);
					}

					selectedIds = [];
				}
			}
		});
	}
</script>

<div class="flex h-full flex-col space-y-6">
	<div class="relative flex items-center justify-between">
		<div class="space-y-1">
			<h2 class="text-2xl font-semibold tracking-tight">{m.events_title()}</h2>
			<p class="text-muted-foreground text-sm">{m.events_subtitle()}</p>
		</div>
		<div class="hidden items-center gap-2 sm:flex">
			{#if selectedIds.length > 0}
				<ArcaneButton
					action="remove"
					customLabel={m.events_remove_selected()}
					onclick={handleDeleteSelected}
					loading={isLoading.deleting}
					disabled={isLoading.deleting}
				/>
			{/if}
			<ArcaneButton
				action="restart"
				customLabel={m.common_refresh()}
				onclick={refreshEvents}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
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
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 z-50 min-w-[180px] rounded-md p-1 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm"
				>
					<DropdownMenu.Group>
						{#if selectedIds.length > 0}
							<DropdownMenu.Item onclick={handleDeleteSelected} disabled={isLoading.deleting}>
								{m.events_remove_selected()}
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Item onclick={refreshEvents} disabled={isLoading.refreshing}>
							{m.common_refresh()}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-5">
		<StatCard title={m.events_total()} value={totalEvents} icon={ActivityIcon} subtitle={m.events_total_subtitle()} />
		<StatCard
			title={m.events_info()}
			value={infoEvents}
			icon={ActivityIcon}
			iconColor="text-blue-500"
			bgColor="bg-blue-500/10"
			subtitle={m.events_info_subtitle()}
		/>
		<StatCard
			title={m.events_success()}
			value={successEvents}
			icon={ActivityIcon}
			iconColor="text-green-500"
			bgColor="bg-green-500/10"
			subtitle={m.events_success_subtitle()}
		/>
		<StatCard
			title={m.events_warning()}
			value={warningEvents}
			icon={ActivityIcon}
			iconColor="text-yellow-500"
			bgColor="bg-yellow-500/10"
			subtitle={m.events_warning_subtitle()}
		/>
		<StatCard
			title={m.events_error()}
			value={errorEvents}
			icon={ActivityIcon}
			iconColor="text-red-500"
			bgColor="bg-red-500/10"
			subtitle={m.events_error_subtitle()}
		/>
	</div>

	<div class="flex-1 overflow-hidden">
		<EventTable bind:events bind:selectedIds bind:requestOptions />
	</div>
</div>
