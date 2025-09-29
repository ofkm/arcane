<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { format } from 'date-fns';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ContainerSummaryDto } from '$lib/types/container.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { PortBadge } from '$lib/components/badges/index.js';
	import { containerService } from '$lib/services/container-service';

	let {
		containers = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		baseServerUrl = $bindable()
	}: {
		containers: Paginated<ContainerSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		baseServerUrl: string;
	} = $props();

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		updating: false
	});

	async function performContainerAction(action: string, id: string) {
		isLoading[action as keyof typeof isLoading] = true;

		try {
			if (action === 'start') {
				handleApiResultWithCallbacks({
					result: await tryCatch(containerService.startContainer(id)),
					message: m.containers_start_failed(),
					setLoadingState: (value) => (isLoading.start = value),
					async onSuccess() {
						toast.success(m.containers_start_success());
						containers = await containerService.getContainers(requestOptions);
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(containerService.stopContainer(id)),
					message: m.containers_stop_failed(),
					setLoadingState: (value) => (isLoading.stop = value),
					async onSuccess() {
						toast.success(m.containers_stop_success());
						containers = await containerService.getContainers(requestOptions);
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(containerService.restartContainer(id)),
					message: m.containers_restart_failed(),
					setLoadingState: (value) => (isLoading.restart = value),
					async onSuccess() {
						toast.success(m.containers_restart_success());
						containers = await containerService.getContainers(requestOptions);
					}
				});
			}
		} catch (error) {
			console.error('Container action failed:', error);
			toast.error(m.containers_action_error());
			isLoading[action as keyof typeof isLoading] = false;
		}
	}

	async function handleRemoveContainer(id: string) {
		openConfirmDialog({
			title: m.containers_remove_confirm_title(),
			message: m.containers_remove_confirm_message(),
			checkboxes: [
				{
					id: 'force',
					label: m.containers_remove_force_label(),
					initialState: false
				},
				{
					id: 'volumes',
					label: m.containers_remove_volumes_label(),
					initialState: false
				}
			],
			confirm: {
				label: m.common_remove(),
				destructive: true,
				action: async (checkboxStates) => {
					const force = !!checkboxStates.force;
					const volumes = !!checkboxStates.volumes;
					handleApiResultWithCallbacks({
						result: await tryCatch(containerService.deleteContainer(id, { force, volumes })),
						message: m.containers_remove_failed(),
						setLoadingState: (value) => (isLoading.remove = value),
						async onSuccess() {
							toast.success(m.containers_remove_success());
							containers = await containerService.getContainers(requestOptions);
						}
					});
				}
			}
		});
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	const columns = [
		{ accessorKey: 'names', title: m.common_name(), sortable: true, cell: NameCell },
		{ accessorKey: 'id', title: m.common_id(), cell: IdCell },
		{ accessorKey: 'image', title: m.common_image(), sortable: true },
		{ accessorKey: 'state', title: m.common_state(), sortable: true, cell: StateCell },
		{ accessorKey: 'status', title: m.common_status() },
		{ accessorKey: 'ports', title: m.ports(), cell: PortsCell },
		{ accessorKey: 'created', title: m.common_created(), sortable: true, cell: CreatedCell }
	] satisfies ColumnSpec<ContainerSummaryDto>[];
</script>

{#snippet PortsCell({ item }: { item: ContainerSummaryDto })}
	<PortBadge ports={item.ports ?? []} {baseServerUrl} />
{/snippet}

{#snippet NameCell({ item }: { item: ContainerSummaryDto })}
	<a class="font-medium hover:underline" href="/containers/{item.id}/">
		{#if item.names && item.names.length > 0}
			{item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0]}
		{:else}
			{item.id.substring(0, 12)}
		{/if}
	</a>
{/snippet}

{#snippet IdCell({ item }: { item: ContainerSummaryDto })}
	<span class="font-mono text-sm">{String(item.id).substring(0, 12)}</span>
{/snippet}

{#snippet StateCell({ item }: { item: ContainerSummaryDto })}
	<StatusBadge
		variant={item.state === 'running' ? 'green' : item.state === 'exited' ? 'red' : 'amber'}
		text={capitalizeFirstLetter(item.state)}
	/>
{/snippet}

{#snippet CreatedCell({ item }: { item: ContainerSummaryDto })}
	<span class="text-sm">
		{item.created ? format(new Date(item.created * 1000), 'PP p') : m.common_na()}
	</span>
{/snippet}

{#snippet RowActions({ item }: { item: ContainerSummaryDto })}
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
				<DropdownMenu.Item onclick={() => goto(`/containers/${item.id}`)} disabled={isAnyLoading}>
					<ScanSearchIcon class="size-4" />
					{m.common_inspect()}
				</DropdownMenu.Item>

				{#if item.state !== 'running'}
					<DropdownMenu.Item onclick={() => performContainerAction('start', item.id)} disabled={isLoading.start || isAnyLoading}>
						{#if isLoading.start}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<PlayIcon class="size-4" />
						{/if}
						{m.common_start()}
					</DropdownMenu.Item>
				{:else}
					<DropdownMenu.Item
						onclick={() => performContainerAction('restart', item.id)}
						disabled={isLoading.restart || isAnyLoading}
					>
						{#if isLoading.restart}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<RotateCcwIcon class="size-4" />
						{/if}
						{m.common_restart()}
					</DropdownMenu.Item>

					<DropdownMenu.Item onclick={() => performContainerAction('stop', item.id)} disabled={isLoading.stop || isAnyLoading}>
						{#if isLoading.stop}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<StopCircleIcon class="size-4" />
						{/if}
						{m.common_stop()}
					</DropdownMenu.Item>
				{/if}

				<DropdownMenu.Separator />

				<DropdownMenu.Item
					variant="destructive"
					onclick={() => handleRemoveContainer(item.id)}
					disabled={isLoading.remove || isAnyLoading}
				>
					{#if isLoading.remove}
						<LoaderCircleIcon class="size-4 animate-spin" />
					{:else}
						<Trash2Icon class="size-4" />
					{/if}
					{m.common_remove()}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root class="border shadow-sm">
	<Card.Content>
		<ArcaneTable
			persistKey="arcane-container-table"
			items={containers}
			bind:requestOptions
			bind:selectedIds
			onRefresh={async (options) => (containers = await containerService.getContainers(options))}
			{columns}
			rowActions={RowActions}
			selectionDisabled
		/>
	</Card.Content>
</Card.Root>
