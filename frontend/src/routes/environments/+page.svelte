<script lang="ts">
	import ServerIcon from '@lucide/svelte/icons/server';
	import { toast } from 'svelte-sonner';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import NewEnvironmentSheet from '$lib/components/sheets/new-environment-sheet.svelte';
	import EnvironmentTable from './environment-table.svelte';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { m } from '$lib/paraglide/messages';
	import { environmentManagementService } from '$lib/services/env-mgmt-service';

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
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div class="flex items-center gap-2">
			<div class="rounded-full bg-blue-500/10 p-2">
				<ServerIcon class="size-5 text-blue-500" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{m.environments_title()}</h1>
				<p class="text-muted-foreground mt-1 text-sm">{m.environments_subtitle()}</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if selectedIds.length > 0}
				<ArcaneButton
					action="remove"
					customLabel={m.environments_remove_selected_button()}
					onclick={handleBulkDelete}
					loading={isLoading.deleting}
					disabled={isLoading.deleting}
				/>
			{/if}
			<ArcaneButton action="create" customLabel={m.environments_add_button()} onclick={() => (showEnvironmentSheet = true)} />
			<ArcaneButton
				action="restart"
				customLabel={m.common_refresh()}
				onclick={refresh}
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	<EnvironmentTable bind:environments bind:selectedIds bind:requestOptions />
</div>

<NewEnvironmentSheet bind:open={showEnvironmentSheet} {onEnvironmentCreated} />
