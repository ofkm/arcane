<script lang="ts" generics="TData extends {id: string}">
	import {
		type Column,
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type Row,
		type RowSelectionState,
		type SortingState,
		type VisibilityState,
		type Table as TableType,
		getCoreRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import DataTableToolbar from './arcane-table-toolbar.svelte';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import FlexRender from '$lib/components/ui/data-table/flex-render.svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { renderComponent, renderSnippet } from '$lib/components/ui/data-table/render-helpers.js';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronsLeftIcon from '@lucide/svelte/icons/chevrons-left';
	import ChevronsRightIcon from '@lucide/svelte/icons/chevrons-right';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { Snippet } from 'svelte';
	import type { ColumnSpec } from './arcane-table.types';

	let {
		data,
		items,
		requestOptions = $bindable(),
		withoutSearch = $bindable(),
		withoutPagination = false,
		selectionDisabled = false,
		onRefresh,
		columns,
		rowActions,
		searchColumnId
	}: {
		data: TData[];
		items: Paginated<TData>;
		requestOptions: SearchPaginationSortRequest;
		withoutSearch?: boolean;
		withoutPagination?: boolean;
		selectionDisabled?: boolean;
		onRefresh: (requestOptions: SearchPaginationSortRequest) => Promise<Paginated<TData>>;
		columns: ColumnSpec<TData>[];
		rowActions?: Snippet<[{ row: Row<TData>; item: TData }]>;
		searchColumnId?: string;
	} = $props();

	let rowSelection = $state<RowSelectionState>({});
	let columnVisibility = $state<VisibilityState>({});
	let columnFilters = $state<ColumnFiltersState>([]);
	let sorting = $state<SortingState>([]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let globalFilter = $state<string>('');

	function buildColumns(specs: ColumnSpec<TData>[]): ColumnDef<TData>[] {
		const cols: ColumnDef<TData>[] = [];

		if (!selectionDisabled) {
			cols.push({
				id: 'select',
				header: ({ table }) =>
					renderComponent(Checkbox, {
						checked: table.getIsAllPageRowsSelected(),
						onCheckedChange: (value) => table.toggleAllPageRowsSelected(value),
						indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
						'aria-label': 'Select all'
					}),
				cell: ({ row }) =>
					renderComponent(Checkbox, {
						checked: row.getIsSelected(),
						onCheckedChange: (value) => row.toggleSelected(value),
						'aria-label': 'Select row'
					}),
				enableSorting: false,
				enableHiding: false
			});
		}

		specs.forEach((spec, i) => {
			const accessorKey = spec.accessorKey;
			const id = spec.id ?? (accessorKey as string) ?? `col_${i}`;

			cols.push({
				id,
				...(accessorKey ? { accessorKey } : {}),
				header: ({ column }) => {
					if (spec.header) return renderSnippet(spec.header, { column, title: spec.title, class: spec.class });
					if (spec.sortable) return renderSnippet(ColumnHeader, { column, title: spec.title, class: spec.class });
					return renderSnippet(PlainHeader, { title: spec.title, class: spec.class });
				},
				cell: ({ row, getValue }) => {
					const item = row.original as TData;
					const value = accessorKey ? row.getValue(accessorKey) : getValue?.();
					if (spec.cell) return renderSnippet(spec.cell, { row, item, value });
					return renderSnippet(TextCell, { value });
				},
				enableSorting: !!spec.sortable,
				enableHiding: true,
				filterFn: spec.filterFn
			});

			if (spec.hidden) {
				columnVisibility[String(accessorKey ?? id)] = false;
			}
		});

		if (rowActions) {
			cols.push({
				id: 'actions',
				cell: ({ row }) => renderSnippet(rowActions, { row, item: row.original as TData })
			});
		}

		return cols;
	}

	const columnsDef: ColumnDef<TData>[] = buildColumns(columns);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		state: {
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnFilters() {
				return columnFilters;
			},
			get pagination() {
				return pagination;
			},
			get globalFilter() {
				return globalFilter;
			}
		},
		columns: columnsDef,
		enableRowSelection: !selectionDisabled,
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
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
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onGlobalFilterChange: (value) => {
			globalFilter = (value ?? '') as string;
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues()
	});
</script>

{#snippet TextCell({ value }: { value: unknown })}
	<span class="max-w-[500px] truncate">{value ?? ''}</span>
{/snippet}

{#snippet PlainHeader({ title, class: className, ...restProps }: { title: string } & HTMLAttributes<HTMLDivElement>)}
	<div class={className} {...restProps}>{title}</div>
{/snippet}

{#snippet Pagination({ table }: { table: TableType<TData> })}
	<div class="flex items-center justify-between px-2">
		<div class="text-muted-foreground flex-1 text-sm">
			Showing {table.getFilteredRowModel().rows.length} of
			{items.pagination.totalItems} item(s).
			<!-- {table.getFilteredSelectedRowModel().rows.length} of
			{table.getFilteredRowModel().rows.length} row(s) selected. -->
		</div>
		<div class="flex items-center space-x-6 lg:space-x-8">
			<div class="flex items-center space-x-2">
				<p class="text-sm font-medium">Rows per page</p>
				<Select.Root
					allowDeselect={false}
					type="single"
					value={`${table.getState().pagination.pageSize}`}
					onValueChange={(value) => {
						table.setPageSize(Number(value));
					}}
				>
					<Select.Trigger class="h-8 w-[70px]">
						{String(table.getState().pagination.pageSize)}
					</Select.Trigger>
					<Select.Content side="top">
						{#each [10, 20, 30, 40, 50] as pageSize (pageSize)}
							<Select.Item value={`${pageSize}`}>
								{pageSize}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex w-[100px] items-center justify-center text-sm font-medium">
				Page {table.getState().pagination.pageIndex + 1} of
				{table.getPageCount()}
			</div>
			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					class="hidden size-8 p-0 lg:flex"
					onclick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
				>
					<span class="sr-only">Go to first page</span>
					<ChevronsLeftIcon />
				</Button>
				<Button variant="outline" class="size-8 p-0" onclick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
					<span class="sr-only">Go to previous page</span>
					<ChevronLeftIcon />
				</Button>
				<Button variant="outline" class="size-8 p-0" onclick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
					<span class="sr-only">Go to next page</span>
					<ChevronRightIcon />
				</Button>
				<Button
					variant="outline"
					class="hidden size-8 p-0 lg:flex"
					onclick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
				>
					<span class="sr-only">Go to last page</span>
					<ChevronsRightIcon />
				</Button>
			</div>
		</div>
	</div>
{/snippet}

{#snippet ColumnHeader({
	column,
	title,
	class: className,
	...restProps
}: { column: Column<TData>; title: string } & HTMLAttributes<HTMLDivElement>)}
	{#if !column?.getCanSort()}
		<div class={className} {...restProps}>
			{title}
		</div>
	{:else}
		<div class={cn('flex items-center', className)} {...restProps}>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="data-[state=open]:bg-accent -ml-3 h-8">
							<span>
								{title}
							</span>
							{#if column.getIsSorted() === 'desc'}
								<ArrowDownIcon />
							{:else if column.getIsSorted() === 'asc'}
								<ArrowUpIcon />
							{:else}
								<ChevronsUpDownIcon />
							{/if}
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					<DropdownMenu.Item onclick={() => column.toggleSorting(false)}>
						<ArrowUpIcon class="text-muted-foreground/70 mr-2 size-3.5" />
						Asc
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => column.toggleSorting(true)}>
						<ArrowDownIcon class="text-muted-foreground/70 mr-2 size-3.5" />
						Desc
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => column.toggleVisibility(false)}>
						<EyeOffIcon class="text-muted-foreground/70 mr-2 size-3.5" />
						Hide
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}
{/snippet}

<div class="space-y-4">
	<DataTableToolbar {table} />
	<div class="rounded-md">
		<Table.Root>
			<Table.Header>
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
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row data-state={row.getIsSelected() && 'selected'}>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columnsDef.length} class="h-24 text-center">No results.</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
	{@render Pagination({ table })}
</div>
