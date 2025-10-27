<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
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
	import { UniversalMobileCard } from '$lib/components/arcane-table/index.js';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ImageIcon from '@lucide/svelte/icons/image';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { containerService } from '$lib/services/container-service';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Table as TableType } from '@tanstack/table-core';
	import * as Table from '$lib/components/ui/table/index.js';
	import FlexRender from '$lib/components/ui/data-table/flex-render.svelte';
	import { PersistedState } from 'runed';

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
		{ accessorKey: 'state', title: m.common_state(), sortable: true, cell: StateCell },
		{ accessorKey: 'image', title: m.common_image(), sortable: true },
		{ accessorKey: 'status', title: m.common_status() },
		{ accessorKey: 'ports', title: m.common_ports(), cell: PortsCell },
		{ accessorKey: 'created', title: m.common_created(), sortable: true, cell: CreatedCell }
	] satisfies ColumnSpec<ContainerSummaryDto>[];

	const mobileFields = [
		{ id: 'id', label: m.common_id(), defaultVisible: true },
		{ id: 'state', label: m.common_state(), defaultVisible: true },
		{ id: 'image', label: m.common_image(), defaultVisible: true },
		{ id: 'status', label: m.common_status(), defaultVisible: true },
		{ id: 'ports', label: m.common_ports(), defaultVisible: true },
		{ id: 'created', label: m.common_created(), defaultVisible: true }
	];

	let mobileFieldVisibility = $state<Record<string, boolean>>({});
	let customSettings = $state<Record<string, unknown>>({});
	let groupByProject = $derived.by(() => {
		return (customSettings.groupByProject as boolean) ?? false;
	});

	function setGroupByProject(value: boolean) {
		customSettings = { ...customSettings, groupByProject: value };
	}

	const projectOpenStates = new PersistedState<Record<string, boolean>>(
		'arcane-container-groups-collapsed',
		{},
		{ syncTabs: false }
	);

	function toggleProjectState(projectName: string, isOpen: boolean) {
		projectOpenStates.current = { ...projectOpenStates.current, [projectName]: isOpen };
	}

	function getProjectName(container: ContainerSummaryDto): string {
		const projectLabel = container.labels?.['com.docker.compose.project'];
		return projectLabel || 'No Project';
	}

	const groupedContainers = $derived(() => {
		if (!groupByProject) return null;

		const groups = new Map<string, ContainerSummaryDto[]>();

		for (const container of containers.data ?? []) {
			const projectName = getProjectName(container);
			if (!groups.has(projectName)) {
				groups.set(projectName, []);
			}
			groups.get(projectName)!.push(container);
		}

		const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
			if (a === 'No Project') return 1;
			if (b === 'No Project') return -1;
			return a.localeCompare(b);
		});

		return sortedGroups;
	});
</script>

{#snippet PortsCell({ item }: { item: ContainerSummaryDto })}
	<PortBadge ports={item.ports ?? []} {baseServerUrl} />
{/snippet}

{#snippet NameCell({ item }: { item: ContainerSummaryDto })}
	<a class="font-medium hover:underline" href="/containers/{item.id}">
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

{#snippet ContainerMobileCardSnippet({
	row,
	item,
	mobileFieldVisibility
}: {
	row: any;
	item: ContainerSummaryDto;
	mobileFieldVisibility: Record<string, boolean>;
})}
	<UniversalMobileCard
		{item}
		icon={(item) => {
			const state = item.state;
			return {
				component: BoxIcon,
				variant: state === 'running' ? 'emerald' : state === 'exited' ? 'red' : 'amber'
			};
		}}
		title={(item) => {
			if (item.names && item.names.length > 0) {
				return item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0];
			}
			return item.id.substring(0, 12);
		}}
		subtitle={(item) => ((mobileFieldVisibility.id ?? true) ? (item.id.length > 12 ? item.id : null) : null)}
		badges={[
			(item) =>
				(mobileFieldVisibility.state ?? true)
					? {
							variant: item.state === 'running' ? 'green' : item.state === 'exited' ? 'red' : 'amber',
							text: capitalizeFirstLetter(item.state)
						}
					: null
		]}
		fields={[
			{
				label: m.common_image(),
				getValue: (item: ContainerSummaryDto) => item.image,
				icon: ImageIcon,
				iconVariant: 'blue' as const,
				show: mobileFieldVisibility.image ?? true
			},
			{
				label: m.common_status(),
				getValue: (item: ContainerSummaryDto) => item.status,
				icon: ClockIcon,
				iconVariant: 'purple' as const,
				show: (mobileFieldVisibility.status ?? true) && item.status !== undefined
			}
		]}
		footer={(mobileFieldVisibility.created ?? true)
			? {
					label: m.common_created(),
					getValue: (item) => format(new Date(item.created * 1000), 'PP p'),
					icon: ClockIcon
				}
			: undefined}
		rowActions={RowActions}
		onclick={(item: ContainerSummaryDto) => goto(`/containers/${item.id}`)}
	>
		{#snippet children()}
			{#if (mobileFieldVisibility.ports ?? true) && item.ports && item.ports.length > 0}
				<div class="flex items-start gap-2.5 border-t pt-3">
					<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
						<NetworkIcon class="size-3.5 text-sky-500" />
					</div>
					<div class="min-w-0 flex-1">
						<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
							{m.common_ports()}
						</div>
						<div class="mt-1">
							<PortBadge ports={item.ports} {baseServerUrl} />
						</div>
					</div>
				</div>
			{/if}
		{/snippet}
	</UniversalMobileCard>
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
							<Spinner class="size-4" />
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
							<Spinner class="size-4" />
						{:else}
							<RotateCcwIcon class="size-4" />
						{/if}
						{m.common_restart()}
					</DropdownMenu.Item>

					<DropdownMenu.Item onclick={() => performContainerAction('stop', item.id)} disabled={isLoading.stop || isAnyLoading}>
						{#if isLoading.stop}
							<Spinner class="size-4" />
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
						<Spinner class="size-4" />
					{:else}
						<Trash2Icon class="size-4" />
					{/if}
					{m.common_remove()}
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<ArcaneTable
	persistKey="arcane-container-table"
	items={containers}
	bind:requestOptions
	bind:selectedIds
	bind:mobileFieldVisibility
	bind:customSettings
	onRefresh={async (options) => (containers = await containerService.getContainers(options))}
	{columns}
	{mobileFields}
	rowActions={RowActions}
	mobileCard={ContainerMobileCardSnippet}
	selectionDisabled
	customViewOptions={CustomViewOptions}
	customTableView={groupByProject && groupedContainers() ? GroupedTableView : undefined}
/>

{#snippet CustomViewOptions()}
	<DropdownMenu.CheckboxItem bind:checked={() => groupByProject, (v) => setGroupByProject(!!v)}>
		{m.containers_group_by_project()}
	</DropdownMenu.CheckboxItem>
{/snippet}

{#snippet GroupedTableView({ table }: { table: TableType<ContainerSummaryDto> })}
	<div class="space-y-4">
		{#each groupedContainers() ?? [] as [projectName, projectContainers] (projectName)}
			{@const projectContainerIds = new Set(projectContainers.map((c) => c.id))}
			{@const projectRows = table
				.getRowModel()
				.rows.filter((row) => projectContainerIds.has((row.original as ContainerSummaryDto).id))}

			<Collapsible.Root
				class="isolate overflow-hidden overflow-y-hidden rounded-[--radius-xl] border-[1.5px] border-[color-mix(in_oklch,var(--border)_70%,color-mix(in_oklch,var(--foreground)_8%,transparent))] bg-[radial-gradient(140%_100%_at_50%_0%,color-mix(in_oklch,var(--glass-tint,var(--primary))_4%,transparent)_0%,transparent_70%),color-mix(in_oklch,var(--glass-base,var(--bg-surface))_var(--glass-medium-alpha),transparent)] shadow-[0_8px_32px_-8px_var(--glass-shadow-color),0_0_0_1px_color-mix(in_oklch,var(--glass-stroke-outer)_60%,transparent)_inset,0_2px_8px_-2px_color-mix(in_oklch,var(--glass-tint,var(--primary))_8%,transparent)_inset] backdrop-blur-[--glass-blur-md] backdrop-saturate-[--glass-saturation]"
				open={projectOpenStates.current[projectName] ?? false}
				onOpenChange={(open) => toggleProjectState(projectName, open)}
			>
				<Collapsible.Trigger
					class="hover:bg-accent/50 flex w-full items-center justify-between border-b-[1.5px] border-[color-mix(in_oklch,var(--border)_60%,color-mix(in_oklch,var(--foreground)_12%,transparent))] bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--glass-tint,var(--primary))_6%,transparent),color-mix(in_oklch,var(--glass-base,var(--bg-surface))_var(--glass-light-alpha),transparent))] px-6 py-4 text-left backdrop-blur-[--glass-blur-sm] transition-colors"
				>
					<div class="flex items-center gap-2">
						{#if projectOpenStates.current[projectName] ?? false}
							<ChevronDownIcon class="size-4 transition-transform" />
						{:else}
							<ChevronRightIcon class="size-4 transition-transform" />
						{/if}
						<span class="font-semibold">{projectName}</span>
						<Badge variant="secondary" class="ml-2">{projectContainers.length}</Badge>
					</div>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="hidden md:block">
						<Table.Root
							class="**:data-[slot='table-container']:rounded-none **:data-[slot='table-container']:border-0 **:data-[slot='table-container']:bg-transparent **:data-[slot='table-container']:shadow-none **:data-[slot='table-container']:backdrop-filter-none"
						>
							<Table.Header class="border-border/40 border-t">
								{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
									<Table.Row>
										{#each headerGroup.headers as header (header.id)}
											<Table.Head colspan={header.colSpan}>
												{#if !header.isPlaceholder}
													<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
												{/if}
											</Table.Head>
										{/each}
									</Table.Row>
								{/each}
							</Table.Header>
							<Table.Body>
								{#each projectRows as row (row.id)}
									<Table.Row data-state={(selectedIds ?? []).includes((row.original as ContainerSummaryDto).id) && 'selected'}>
										{#each row.getVisibleCells() as cell (cell.id)}
											<Table.Cell>
												<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
											</Table.Cell>
										{/each}
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={table.getAllColumns().length} class="h-24 text-center"
											>{m.common_no_results_found()}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<div class="space-y-3 p-4 md:hidden">
						{#each projectRows as row (row.id)}
							{@render ContainerMobileCardSnippet({ row, item: row.original as ContainerSummaryDto, mobileFieldVisibility })}
						{:else}
							<div class="h-24 flex items-center justify-center text-center text-muted-foreground">
								{m.common_no_results_found()}
							</div>
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		{/each}
	</div>
{/snippet}
