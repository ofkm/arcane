<script lang="ts" generics="TData extends object">
	import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, type SortingState, getFilteredRowModel, type ColumnFiltersState } from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { debounced } from '$lib/utils';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import type { UniversalTableProps } from '$lib/types/table-types';
	import type { Snippet } from 'svelte';

	let {
		data,
		columns,
		idKey,
		features = {},
		display = {},
		pagination = {},
		sort = {},
		selectedIds = $bindable<string[]>([]),
		rows
	}: UniversalTableProps<TData> & {
		idKey?: keyof TData;
		rows?: Snippet<[{ item: TData; index?: number }]>;
	} = $props();

	let { sorting: enableSorting = true, filtering: enableFiltering = true, selection: enableSelection = true } = features;
	let { pageSize: initialPageSize = 10, pageSizeOptions = [10, 20, 50, 100], itemsPerPageLabel = 'Items per page' } = pagination;
	let { filterPlaceholder = 'Search...', noResultsMessage = 'No results found', isDashboardTable = false, class: className = '' } = display;
	let { defaultSort = { id: 'name', desc: false } } = sort;

	let pageSize = $state(initialPageSize);
	let pageIndex = $state(0);
	let currentPage = $state(1);
	let sorting = $state<SortingState>(defaultSort ? [defaultSort] : []);
	let columnFilters = $state<ColumnFiltersState>([]);
	let globalFilter = $state<string>('');
	let selectedRowIds = $derived<Record<string, boolean>>({});

	$effect(() => {
		const newTanstackSelectionState: Record<string, boolean> = {};
		(selectedIds || []).forEach((id) => {
			newTanstackSelectionState[id] = true;
		});

		const currentTanstackSelectedKeys = Object.keys(selectedRowIds)
			.filter((k) => selectedRowIds[k])
			.sort();
		const newPropSelectedKeys = Object.keys(newTanstackSelectionState).sort();

		if (JSON.stringify(currentTanstackSelectedKeys) !== JSON.stringify(newPropSelectedKeys)) {
			table.setRowSelection(newTanstackSelectionState);
		}
	});

	$effect(() => {
		pageIndex = currentPage - 1;
	});

	$effect(() => {
		const tablePageIndex = table.getState().pagination.pageIndex;
		if (tablePageIndex !== pageIndex) {
			currentPage = tablePageIndex + 1;
		}
	});

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getRowId: idKey
			? (originalRow: TData) => {
					return String(originalRow[idKey]);
				}
			: undefined,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
		getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
		state: {
			get pagination() {
				return {
					pageIndex,
					pageSize
				};
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get globalFilter() {
				return globalFilter;
			},
			get rowSelection() {
				return selectedRowIds;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onGlobalFilterChange: (value) => {
			globalFilter = value;
			pageIndex = 0;
			currentPage = 1;
		},
		onRowSelectionChange: (updater) => {
			const newInternalState = typeof updater === 'function' ? updater(selectedRowIds) : updater;

			if (JSON.stringify(newInternalState) !== JSON.stringify(selectedRowIds)) {
				selectedRowIds = newInternalState;
			}

			const newSelectedIdsArray = Object.entries(selectedRowIds)
				.filter(([key, selected]) => selected)
				.map(([id]) => id);

			const sortedCurrentProp = [...(selectedIds || [])].sort();
			const sortedNewInternal = [...newSelectedIdsArray].sort();

			if (JSON.stringify(sortedCurrentProp) !== JSON.stringify(sortedNewInternal)) {
				selectedIds = newSelectedIdsArray;
			}
		},
		enableRowSelection: enableSelection
	});

	const pageCount = $derived(table.getPageCount());
	const filteredRowCount = $derived(table.getFilteredRowModel().rows.length);

	const handleFilterChange = debounced((value: string) => {
		table.setGlobalFilter(value);
	}, 300);

	const allRowsSelected = $derived(table.getIsAllPageRowsSelected() && table.getRowModel().rows.length > 0);

	function handlePageSizeChange(size: string | number) {
		const sizeNumber = typeof size === 'string' ? parseInt(size) : size;
		pageSize = sizeNumber;
		table.setPageSize(sizeNumber);
		pageIndex = 0;
		currentPage = 1;
	}
</script>

<div class={cn('space-y-4', className, isDashboardTable && 'dashboard-table')}>
	{#if enableFiltering && !isDashboardTable}
		<div class="flex items-center">
			<Input placeholder={filterPlaceholder} value={globalFilter} oninput={(e) => handleFilterChange(e.currentTarget.value)} class="max-w-sm" />
		</div>
	{/if}

	<div class={cn('rounded-md border', isDashboardTable && 'border-none rounded-none')}>
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#if enableSelection}
							<Table.Head class="size-12">
								<Checkbox checked={allRowsSelected} onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)} />
							</Table.Head>
						{/if}
						{#each headerGroup.headers as header (header.id)}
							<Table.Head>
								{#if !header.isPlaceholder}
									{#if header.column.getCanSort()}
										<Button variant="ghost" class="flex items-center p-0 hover:bg-transparent" onclick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}>
											<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
											{#if header.column.getIsSorted()}
												<ChevronDown class={cn('ml-2 h-4 w-4', header.column.getIsSorted() === 'asc' ? 'rotate-180' : '')} />
											{/if}
										</Button>
									{:else}
										<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
									{/if}
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if table.getRowModel().rows.length > 0}
					{#each table.getRowModel().rows as row (row.id)}
						{@const isDisabled = 'isExternal' in row.original && !!row.original.isExternal}
						<Table.Row data-state={row.getIsSelected() && 'selected'}>
							{#if enableSelection}
								<Table.Cell class="size-12">
									<Checkbox
										checked={row.getIsSelected()}
										disabled={isDisabled}
										onCheckedChange={(checked) => {
											if (!isDisabled) {
												row.toggleSelected(!!checked);
											}
										}}
										aria-label="Select row"
									/>
								</Table.Cell>
							{/if}

							{#if rows}
								{@render rows({ item: row.original, index: row.index })}
							{:else}
								{#each row.getVisibleCells() as cell (cell.id)}
									<Table.Cell>
										<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
									</Table.Cell>
								{/each}
							{/if}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={enableSelection ? columns.length + 1 : columns.length} class="text-center size-24">
							{noResultsMessage}
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination Controls -->
	{#if (pageCount > 1 || pageSizeOptions.length > 1) && !isDashboardTable}
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
			{#if pageSizeOptions.length > 1}
				<div class="flex items-center gap-4">
					<span class="text-sm my-auto">{itemsPerPageLabel}</span>
					<Select.Root type="single" value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(value)}>
						<Select.Trigger class="h-8 w-[70px]" id="pageSize">
							<span>
								{pageSize}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#each pageSizeOptions as size}
								<Select.Item value={size.toString()}>
									{size}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<div class="ml-auto">
				<Pagination.Root count={filteredRowCount} perPage={pageSize} bind:page={currentPage}>
					{#snippet children({ pages, currentPage })}
						<Pagination.Content>
							<Pagination.Item>
								<Pagination.PrevButton />
							</Pagination.Item>
							{#each pages as page (page.key)}
								{#if page.type === 'ellipsis'}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link {page} isActive={currentPage === page.value}>
											{page.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}
							<Pagination.Item>
								<Pagination.NextButton />
							</Pagination.Item>
						</Pagination.Content>
					{/snippet}
				</Pagination.Root>
			</div>
		</div>
	{/if}
</div>
