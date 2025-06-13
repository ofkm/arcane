<script lang="ts" generics="TData extends Record<string, any>">
	import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, type SortingState, type ColumnFiltersState } from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { debounced } from '$lib/utils';
	import type { UniversalTableProps } from '$lib/types/table-types';
	import type { Snippet } from 'svelte';

	interface TableData extends Record<string, any> {
		isExternal?: boolean;
	}

	interface TableFeatures {
		sorting?: boolean;
		filtering?: boolean;
		selection?: boolean;
	}

	interface TableDisplay {
		pageSize?: number;
		pageSizeOptions?: number[];
		itemsPerPageLabel?: string;
		filterPlaceholder?: string;
		noResultsMessage?: string;
		isDashboardTable?: boolean;
		class?: string;
	}

	interface TablePagination {
		pageSize?: number;
		pageSizeOptions?: number[];
		itemsPerPageLabel?: string;
	}

	interface TableSort {
		defaultSort?: { id: string; desc: boolean };
	}

	// Props with better defaults and validation
	let {
		data,
		columns,
		idKey,
		features = {},
		display = {},
		pagination = {},
		sort = {},
		selectedIds = $bindable<string[]>([]),
		rows,
		onPageSizeChange = $bindable<((size: number) => void) | undefined>(undefined)
	}: UniversalTableProps<TData> & {
		idKey?: keyof TData;
		rows?: Snippet<[{ item: TData; index?: number }]>;
		onPageSizeChange?: ((size: number) => void) | undefined;
	} = $props();

	// Destructure with proper defaults
	const { sorting: enableSorting = true, filtering: enableFiltering = true, selection: enableSelection = true }: TableFeatures = features;

	const { pageSize: initialPageSize = 10, pageSizeOptions = [10, 20, 50, 100], itemsPerPageLabel = 'Items per page' }: TablePagination = pagination;

	const { filterPlaceholder = 'Search...', noResultsMessage = 'No results found', isDashboardTable = false, class: className = '' }: TableDisplay = display;

	const { defaultSort }: TableSort = sort;

	// State management with better initialization
	let pageSize = $state(Math.max(1, initialPageSize));
	let pageIndex = $state(0);
	let currentPage = $state(1);
	let sorting = $state<SortingState>(defaultSort ? [defaultSort] : []);
	let columnFilters = $state<ColumnFiltersState>([]);
	let globalFilter = $state<string>('');
	let rowSelection = $state<Record<string, boolean>>({});

	// Optimized debounced filter function
	const debouncedFilter = debounced((value: string) => {
		table.setGlobalFilter(value);
	}, 300);

	// Effect for syncing external selectedIds with internal state
	$effect(() => {
		if (!enableSelection) return;

		const newSelection: Record<string, boolean> = {};
		selectedIds.forEach((id) => {
			if (id) newSelection[id] = true;
		});

		const currentKeys = Object.keys(rowSelection)
			.filter((k) => rowSelection[k])
			.sort();
		const newKeys = Object.keys(newSelection).sort();

		if (JSON.stringify(currentKeys) !== JSON.stringify(newKeys)) {
			rowSelection = newSelection;
		}
	});

	// Effect for syncing page changes
	$effect(() => {
		const newPageIndex = Math.max(0, currentPage - 1);
		if (pageIndex !== newPageIndex) {
			pageIndex = newPageIndex;
		}
	});

	// Effect for syncing table page state
	$effect(() => {
		const tablePageIndex = table.getState().pagination.pageIndex;
		const expectedCurrentPage = tablePageIndex + 1;
		if (currentPage !== expectedCurrentPage) {
			currentPage = expectedCurrentPage;
		}
	});

	// Create table instance
	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getRowId: idKey ? (originalRow: TData) => String(originalRow[idKey]) : undefined,
		getCoreRowModel: getCoreRowModel(),
		...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
		...(enableFiltering && { getFilteredRowModel: getFilteredRowModel() }),
		getPaginationRowModel: getPaginationRowModel(),
		enableRowSelection: enableSelection,
		state: {
			get pagination() {
				return { pageIndex, pageSize };
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
				return rowSelection;
			}
		},
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onColumnFiltersChange: (updater) => {
			columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
		},
		onGlobalFilterChange: (value) => {
			globalFilter = value ?? '';
			pageIndex = 0;
			currentPage = 1;
		},
		onRowSelectionChange: (updater) => {
			if (!enableSelection) return;

			const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;

			if (JSON.stringify(newSelection) !== JSON.stringify(rowSelection)) {
				rowSelection = newSelection;

				// Update external selectedIds
				const newSelectedIds = Object.entries(newSelection)
					.filter(([_, selected]) => selected)
					.map(([id]) => id);

				if (JSON.stringify(selectedIds.sort()) !== JSON.stringify(newSelectedIds.sort())) {
					selectedIds = newSelectedIds;
				}
			}
		}
	});

	// Memoized computations
	const validPageSizeOptions = $derived(pageSizeOptions.filter((size) => size > 0).sort((a, b) => a - b));

	const shouldShowPagination = $derived(!isDashboardTable && (table.getPageCount() > 1 || validPageSizeOptions.length > 1));

	const shouldShowFiltering = $derived(enableFiltering && !isDashboardTable);

	const allRowsSelected = $derived(table.getIsAllPageRowsSelected() && table.getRowModel().rows.length > 0);

	const filteredRowCount = $derived(table.getFilteredRowModel().rows.length);

	// Event handlers
	function handleFilterChange(value: string) {
		debouncedFilter(value);
	}

	function handlePageSizeChange(size: string | number) {
		const sizeNumber = typeof size === 'string' ? parseInt(size, 10) : size;

		if (!isNaN(sizeNumber) && sizeNumber > 0) {
			pageSize = sizeNumber;
			table.setPageSize(sizeNumber);
			pageIndex = 0;
			currentPage = 1;

			onPageSizeChange?.(sizeNumber);
		}
	}

	function handleSelectAllChange(checked: boolean) {
		table.toggleAllPageRowsSelected(checked);
	}

	function handleRowSelectionChange(row: any, checked: boolean) {
		const isDisabled = row.original?.isExternal ?? false;
		if (!isDisabled) {
			row.toggleSelected(checked);
		}
	}

	function handleSortChange(header: any) {
		header.column.toggleSorting(header.column.getIsSorted() === 'asc');
	}
</script>

<div class={cn('space-y-4', className, isDashboardTable && 'dashboard-table')}>
	<!-- Search Filter -->
	{#if shouldShowFiltering}
		<div class="flex items-center">
			<Input placeholder={filterPlaceholder} value={globalFilter} oninput={(e) => handleFilterChange(e.currentTarget.value)} class="max-w-sm" />
		</div>
	{/if}

	<!-- Table -->
	<div class={cn('rounded-md border', isDashboardTable && 'rounded-none border-none')}>
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#if enableSelection}
							<Table.Head class="size-12">
								<Checkbox checked={allRowsSelected} onCheckedChange={handleSelectAllChange} aria-label="Select all rows" />
							</Table.Head>
						{/if}
						{#each headerGroup.headers as header (header.id)}
							<Table.Head>
								{#if !header.isPlaceholder}
									{#if header.column.getCanSort()}
										<Button variant="ghost" class="flex items-center p-0 hover:bg-transparent" onclick={() => handleSortChange(header)} aria-label="Sort by {header.column.columnDef.header}">
											<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
											{#if header.column.getIsSorted()}
												<ChevronDown class={cn('ml-2 size-4 transition-transform', header.column.getIsSorted() === 'asc' && 'rotate-180')} />
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
						{@const isDisabled = row.original?.isExternal ?? false}
						<Table.Row data-state={row.getIsSelected() ? 'selected' : undefined}>
							{#if enableSelection}
								<Table.Cell class="size-12">
									<Checkbox checked={row.getIsSelected()} disabled={isDisabled} onCheckedChange={(checked) => handleRowSelectionChange(row, !!checked)} aria-label="Select row" />
								</Table.Cell>
							{/if}

							{#if rows}
								{@render rows({ item: row.original, index: row.index })}
							{:else}
								{#each row.getVisibleCells() as cell (cell.id)}
									<Table.Cell class="w-32">
										<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
									</Table.Cell>
								{/each}
							{/if}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={enableSelection ? columns.length + 1 : columns.length} class="size-24 text-center">
							{noResultsMessage}
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination Controls -->
	{#if shouldShowPagination}
		<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
			{#if validPageSizeOptions.length > 1}
				<div class="flex items-center gap-4">
					<span class="text-sm whitespace-nowrap">{itemsPerPageLabel}</span>
					<Select.Root type="single" value={pageSize.toString()} onValueChange={handlePageSizeChange}>
						<Select.Trigger class="h-8 w-[70px]" aria-label="Items per page">
							<span>{pageSize}</span>
						</Select.Trigger>
						<Select.Content>
							{#each validPageSizeOptions as size (size)}
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
					{#snippet children({ pages, currentPage: paginationCurrentPage })}
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
										<Pagination.Link {page} isActive={paginationCurrentPage === page.value}>
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
