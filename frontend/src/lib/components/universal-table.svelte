<script lang="ts" generics="TData extends Record<string, any>">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { debounced } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { ExternalPagination } from '$lib/types/pagination.type';

	let {
		data,
		externalPagination,
		selectedIds = $bindable(),
		withoutSearch = false,
		selectionDisabled = false,
		onRefresh,
		onPageChange,
		onPageSizeChange,
		onSort,
		columns,
		rows,
		idKey = 'id',
		filterPlaceholder = 'Search...',
		noResultsMessage = 'No results found',
		itemsPerPageLabel = 'Items per page',
		class: className = ''
	}: {
		data: TData[];
		externalPagination?: ExternalPagination;
		selectedIds?: string[];
		withoutSearch?: boolean;
		selectionDisabled?: boolean;
		onRefresh?: () => Promise<void>;
		onPageChange?: (page: number) => void;
		onPageSizeChange?: (size: number) => void;
		onSort?: (column: string, direction: 'asc' | 'desc') => void;
		columns: { label: string; hidden?: boolean; sortColumn?: string }[];
		rows: Snippet<[{ item: TData; index?: number }]>;
		idKey?: string;
		filterPlaceholder?: string;
		noResultsMessage?: string;
		itemsPerPageLabel?: string;
		class?: string;
	} = $props();

	let searchValue = $state('');
	let availablePageSizes: number[] = [10, 20, 50, 100];
	let sortColumn = $state<string>('');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	const isExternalPagination = $derived(!!externalPagination);

	let allChecked = $derived.by(() => {
		if (!selectedIds || data.length === 0) return false;
		for (const item of data) {
			const itemId = String(item[idKey]);
			if (!selectedIds.includes(itemId)) {
				return false;
			}
		}
		return true;
	});

	const onSearch = debounced(async (search: string) => {
		searchValue = search;
		if (onRefresh) {
			await onRefresh();
		}
	}, 300);

	const filteredData = $derived(() => {
		if (!searchValue || isExternalPagination) return data;

		return data.filter((item) => {
			return Object.values(item).some((value) =>
				String(value).toLowerCase().includes(searchValue.toLowerCase())
			);
		});
	});

	async function onAllCheck(checked: boolean) {
		if (checked) {
			selectedIds = data.map((item) => String(item[idKey]));
		} else {
			selectedIds = [];
		}
	}

	async function onCheck(checked: boolean, id: string) {
		if (!selectedIds) return;
		if (checked) {
			selectedIds = [...selectedIds, id];
		} else {
			selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
		}
	}

	async function handlePageChange(page: number) {
		onPageChange?.(page);
	}

	async function handlePageSizeChange(size: number) {
		onPageSizeChange?.(size);
	}

	async function handleSort(column?: string, direction: 'asc' | 'desc' = 'asc') {
		if (!column) return;

		sortColumn = column;
		sortDirection = direction;
		onSort?.(column, direction);
	}

	const currentPageSize = $derived(externalPagination?.pageSize || 10);

	const currentPage = $derived(externalPagination?.currentPage || 1);

	const totalItems = $derived(externalPagination?.totalItems || filteredData.length);
</script>

<div class={cn('space-y-4', className)}>
	{#if !withoutSearch}
		<Input
			value={searchValue}
			class={cn('relative z-50 max-w-sm', data.length == 0 && searchValue == '' && 'hidden')}
			placeholder={filterPlaceholder}
			type="text"
			oninput={(e) => onSearch(e.currentTarget.value)}
		/>
	{/if}

	{#if data.length === 0 && searchValue === ''}
		<div class="my-5 flex flex-col items-center">
			<p class="text-muted-foreground mt-3 text-sm">{noResultsMessage}</p>
		</div>
	{:else}
		<div class="rounded-md border">
			<Table.Root class="min-w-full table-auto overflow-x-auto">
				<Table.Header>
					<Table.Row>
						{#if selectedIds !== undefined}
							<Table.Head class="w-12">
								<Checkbox
									disabled={selectionDisabled}
									checked={allChecked}
									onCheckedChange={(c) => onAllCheck(c as boolean)}
								/>
							</Table.Head>
						{/if}
						{#each columns as column}
							<Table.Head class={cn(column.hidden && 'sr-only', column.sortColumn && 'px-0')}>
								{#if column.sortColumn}
									<Button
										variant="ghost"
										class="flex items-center"
										onclick={() =>
											handleSort(
												column.sortColumn,
												sortColumn === column.sortColumn && sortDirection === 'asc' ? 'desc' : 'asc'
											)}
									>
										{column.label}
										{#if sortColumn === column.sortColumn}
											<ChevronDown
												class={cn('ml-2 size-4', sortDirection === 'asc' ? 'rotate-180' : '')}
											/>
										{/if}
									</Button>
								{:else}
									{column.label}
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredData as item, index}
						{@const itemId = String(item[idKey])}
						<Table.Row class={selectedIds?.includes(itemId) ? 'bg-muted/20' : ''}>
							{#if selectedIds !== undefined}
								<Table.Cell class="w-12">
									<Checkbox
										disabled={selectionDisabled}
										checked={selectedIds.includes(itemId)}
										onCheckedChange={(c) => onCheck(c as boolean, itemId)}
									/>
								</Table.Cell>
							{/if}
							{@render rows({ item, index })}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="mt-5 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
			<div class="flex items-center space-x-2">
				<p class="text-sm font-medium">{itemsPerPageLabel}</p>
				<Select.Root
					type="single"
					value={currentPageSize.toString()}
					onValueChange={(v) => handlePageSizeChange(Number(v))}
				>
					<Select.Trigger class="h-9 w-[80px]">
						{currentPageSize}
					</Select.Trigger>
					<Select.Content>
						{#each availablePageSizes as size}
							<Select.Item value={size.toString()}>{size}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<Pagination.Root
				class="mx-0 w-auto"
				count={totalItems}
				perPage={currentPageSize}
				onPageChange={handlePageChange}
				page={currentPage}
			>
				{#snippet children({ pages })}
					<Pagination.Content class="flex justify-end">
						<Pagination.Item>
							<Pagination.PrevButton />
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type !== 'ellipsis' && page.value != 0}
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
	{/if}
</div>
