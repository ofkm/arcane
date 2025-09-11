<script lang="ts">
	import type { Project } from '$lib/types/project.type';
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PenIcon from '@lucide/svelte/icons/pen';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { format } from 'date-fns';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';

	let {
		projects = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onCheckForUpdates
	}: {
		projects: Paginated<Project>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onCheckForUpdates: () => Promise<void>;
	} = $props();

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		destroy: false,
		pull: false,
		updating: false
	});

	async function performProjectAction(action: string, id: string) {
		isLoading[action as keyof typeof isLoading] = true;

		try {
			if (action === 'start') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.deployProject(id)),
					message: m.compose_start_failed(),
					setLoadingState: (value) => (isLoading.start = value),
					onSuccess: async () => {
						toast.success(m.compose_start_success());
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.downProject(id)),
					message: m.compose_stop_failed(),
					setLoadingState: (value) => (isLoading.stop = value),
					onSuccess: async () => {
						toast.success(m.compose_stop_success());
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.restartProject(id)),
					message: m.compose_restart_failed(),
					setLoadingState: (value) => (isLoading.restart = value),
					onSuccess: async () => {
						toast.success(m.compose_restart_success());
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'pull') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.pullProjectImages(id)),
					message: m.compose_pull_failed(),
					setLoadingState: (value) => (isLoading.pull = value),
					onSuccess: async () => {
						toast.success(m.compose_pull_success());
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'destroy') {
				openConfirmDialog({
					title: m.compose_confirm_removal_title(),
					message: m.compose_confirm_removal_message(),
					checkboxes: [
						{
							id: 'volumes',
							label: m.confirm_remove_volumes_warning(),
							initialState: false
						},
						{
							id: 'files',
							label: m.confirm_remove_project_files(),
							initialState: false
						}
					],
					confirm: {
						label: m.compose_destroy(),
						destructive: true,
						action: async (result: any) => {
							const removeVolumes = !!(result?.checkboxes?.volumes ?? result?.volumes);
							const removeFiles = !!(result?.checkboxes?.files ?? result?.files);

							handleApiResultWithCallbacks({
								result: await tryCatch(environmentAPI.destroyProject(id, removeVolumes, removeFiles)),
								message: m.compose_destroy_failed(),
								setLoadingState: (value) => (isLoading.destroy = value),
								onSuccess: async () => {
									toast.success(m.compose_destroy_success());
									projects = await environmentAPI.getProjects(requestOptions);
								}
							});
						}
					}
				});
			}
		} catch (error) {
			toast.error(m.action_failed());
		}
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	const columns = [
		{ accessorKey: 'name', title: m.common_name(), sortable: true, cell: NameCell },
		{ accessorKey: 'serviceCount', title: m.compose_services(), sortable: true },
		{ accessorKey: 'status', title: m.common_status(), sortable: true, cell: StatusCell },
		{ accessorKey: 'createdAt', title: m.common_created(), sortable: true, cell: CreatedCell }
	] satisfies ColumnSpec<Project>[];
</script>

{#snippet NameCell({ item }: { item: Project })}
	<a class="font-medium hover:underline" href="/compose/{item.id}/">
		{item.name}
	</a>
{/snippet}

{#snippet StatusCell({ item }: { item: Project })}
	{@const stateVariant = getStatusVariant(item.status)}
	<StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.status)} />
{/snippet}

{#snippet CreatedCell({ value }: { value: unknown })}
	{#if value}{format(new Date(String(value)), 'PP p')}{/if}
{/snippet}

{#snippet RowActions({ item }: { item: Project })}
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
				<DropdownMenu.Item onclick={() => goto(`/compose/${item.id}`)} disabled={isAnyLoading}>
					<PenIcon class="size-4" />
					{m.common_edit()}
				</DropdownMenu.Item>

				{#if item.status !== 'running'}
					<DropdownMenu.Item onclick={() => performProjectAction('start', item.id)} disabled={isLoading.start || isAnyLoading}>
						{#if isLoading.start}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<PlayIcon class="size-4" />
						{/if}
						{m.common_start()}
					</DropdownMenu.Item>
				{:else}
					<DropdownMenu.Item
						onclick={() => performProjectAction('restart', item.id)}
						disabled={isLoading.restart || isAnyLoading}
					>
						{#if isLoading.restart}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<RotateCcwIcon class="size-4" />
						{/if}
						{m.common_restart()}
					</DropdownMenu.Item>

					<DropdownMenu.Item onclick={() => performProjectAction('stop', item.id)} disabled={isLoading.stop || isAnyLoading}>
						{#if isLoading.stop}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<StopCircleIcon class="size-4" />
						{/if}
						{m.common_stop()}
					</DropdownMenu.Item>
				{/if}

				<DropdownMenu.Item onclick={() => performProjectAction('pull', item.id)} disabled={isLoading.pull || isAnyLoading}>
					{#if isLoading.pull}
						<LoaderCircleIcon class="size-4 animate-spin" />
					{:else}
						<RotateCcwIcon class="size-4" />
					{/if}
					{m.compose_pull_redeploy()}
				</DropdownMenu.Item>

				<DropdownMenu.Separator />

				<DropdownMenu.Item
					variant="destructive"
					onclick={() => performProjectAction('destroy', item.id)}
					disabled={isLoading.remove || isAnyLoading}
				>
					{#if isLoading.remove}
						<LoaderCircleIcon class="size-4 animate-spin" />
					{:else}
						<Trash2Icon class="size-4" />
					{/if}
					{m.compose_destroy()}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root>
	<Card.Content class="py-5">
		<ArcaneTable
			items={projects}
			bind:requestOptions
			bind:selectedIds
			onRefresh={async (options) => (projects = await environmentAPI.getProjects(options))}
			{columns}
			rowActions={RowActions}
		/>
	</Card.Content>
</Card.Root>
