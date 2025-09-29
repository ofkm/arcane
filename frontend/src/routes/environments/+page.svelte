<script lang="ts">
	import ServerIcon from '@lucide/svelte/icons/server';
	import { toast } from 'svelte-sonner';
	import NewEnvironmentSheet from '$lib/components/sheets/new-environment-sheet.svelte';
	import EnvironmentTable from './environment-table.svelte';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { m } from '$lib/paraglide/messages';
	import { environmentManagementService } from '$lib/services/env-mgmt-service';
	import { ResourcePageLayout, type ActionButton, type StatCardConfig } from '$lib/layouts/index.js';

	let { data } = $props();

	let environments = $state(data.environments);
	let selectedIds = $state<string[]>([]);
	let requestOptions = $state(data.environmentRequestOptions);
	let showEnvironmentSheet = $state(false);

	let isLoading = $state({
		refresh: false,
		creating: false,
		deleting: false
	});

	async function refresh() {
		isLoading.refresh = true;
		try {
			environments = await environmentManagementService.getEnvironments(requestOptions);
		} catch (err) {
			console.error('Failed to refresh environments:', err);
			toast.error(m.environments_refresh_failed());
		} finally {
			isLoading.refresh = false;
		}
	}

	async function handleBulkDelete() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: m.environments_remove_selected_title({ count: selectedIds.length }),
			message: m.environments_remove_selected_message(),
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async () => {
					isLoading.deleting = true;
					let successCount = 0;
					let failureCount = 0;

					for (const id of selectedIds) {
						const result = await tryCatch(environmentManagementService.delete(id));
						handleApiResultWithCallbacks({
							result,
							message: m.environments_bulk_remove_failed_many({ count: selectedIds.length }),
							setLoadingState: () => {},
							onSuccess: () => {
								successCount += 1;
							}
						});
						if (result.error) failureCount += 1;
					}

					isLoading.deleting = false;

					if (successCount > 0) {
						const msg =
							successCount === 1
								? m.environments_bulk_remove_success_one()
								: m.environments_bulk_remove_success_many({ count: successCount });
						toast.success(msg);
						await refresh();
					}
					if (failureCount > 0) {
						const msg =
							failureCount === 1
								? m.environments_bulk_remove_failed_one()
								: m.environments_bulk_remove_failed_many({ count: failureCount });
						toast.error(msg);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function onEnvironmentCreated() {
		showEnvironmentSheet = false;
		environments = await environmentManagementService.getEnvironments(requestOptions);
		toast.success(m.environments_created_success());
		refresh();
	}

	const actionButtons: ActionButton[] = $derived([
		...(selectedIds.length > 0
			? [
					{
						id: 'remove-selected',
						action: 'remove' as const,
						label: m.environments_remove_selected_button(),
						onclick: handleBulkDelete,
						loading: isLoading.deleting,
						disabled: isLoading.deleting
					}
				]
			: []),
		{
			id: 'create',
			action: 'create' as const,
			label: m.environments_add_button(),
			onclick: () => (showEnvironmentSheet = true)
		},
		{
			id: 'refresh',
			action: 'restart' as const,
			label: m.common_refresh(),
			onclick: refresh,
			loading: isLoading.refresh,
			disabled: isLoading.refresh
		}
	]);
</script>

<ResourcePageLayout title={m.environments_title()} subtitle={m.environments_subtitle()} {actionButtons}>
	{#snippet mainContent()}
		<EnvironmentTable bind:environments bind:selectedIds bind:requestOptions />
	{/snippet}

	{#snippet additionalContent()}
		<NewEnvironmentSheet bind:open={showEnvironmentSheet} {onEnvironmentCreated} />
	{/snippet}
</ResourcePageLayout>
