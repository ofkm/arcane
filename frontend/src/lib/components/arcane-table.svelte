<script lang="ts" generics="TData extends {id: string}">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import { debounced } from '$lib/utils';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		items,
		requestOptions = $bindable(),
		selectedIds = $bindable(),
		withoutSearch = false,
		withoutPagination = false,
		selectionDisabled = false,
		onRefresh,
		columns,
		rows,
		filterPlaceholder = 'Search...',
		noResultsMessage = 'No results found',
		itemsPerPageLabel = 'Items per page',
		class: className = ''
	}: {
		items: Paginated<TData>;
		requestOptions: SearchPaginationSortRequest;
		selectedIds?: string[];
		withoutSearch?: boolean;
		withoutPagination?: boolean;
		selectionDisabled?: boolean;
		onRefresh: (requestOptions: SearchPaginationSortRequest) => Promise<Paginated<TData>>;
		columns: { label: string; hidden?: boolean; sortColumn?: string }[];
		rows: Snippet<[{ item: TData }]>;
		filterPlaceholder?: string;
		noResultsMessage?: string;
		itemsPerPageLabel?: string;
		class?: string;
	} = $props();

	let searchValue = $state('');
	let availablePageSizes: number[] = [10, 20, 50, 100];

	let allChecked = $derived.by(() => {
		if (!selectedIds || items.data.length === 0) return false;
		for (const item of items.data) {
			if (!selectedIds.includes(item.id)) {
				return false;
			}
		}
		return true;
	});

	const onSearch = debounced(async (search: string) => {
		requestOptions.search = search;
		await onRefresh(requestOptions);
		searchValue = search;
	}, 300);

	async function onAllCheck(checked: boolean) {
		if (checked) {
			selectedIds = items.data.map((item) => item.id);
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

	async function onPageChange(page: number) {
		requestOptions.pagination = { limit: items.pagination.itemsPerPage, page };
		onRefresh(requestOptions);
	}

	async function onPageSizeChange(size: number) {
		requestOptions.pagination = { limit: size, page: 1 };
		onRefresh(requestOptions);
	}

	async function onSort(column?: string, direction: 'asc' | 'desc' = 'asc') {
		if (!column) return;

		requestOptions.sort = { column, direction };
		onRefresh(requestOptions);
	}
</script>

<div class={cn('space-y-4', className)}>
	{#if !withoutSearch}
		<Input
			value={searchValue}
			class={cn(
				'relative z-50 mb-4 max-w-sm',
				items.data.length == 0 && searchValue == '' && 'hidden'
			)}
			placeholder={filterPlaceholder}
			type="text"
			oninput={(e) => onSearch(e.currentTarget.value)}
		/>
	{/if}

	{#if items.data.length === 0 && searchValue === ''}
		<div class="my-5 flex flex-col items-center">
			<p class="text-muted-foreground mt-3 text-sm">{noResultsMessage}</p>
		</div>
	{:else}
		<Table.Root class="min-w-full table-auto overflow-x-auto">
			<Table.Header>
				<Table.Row>
					{#if selectedIds && !selectionDisabled}
						<Table.Head class="w-12">
							<Checkbox checked={allChecked} onCheckedChange={(c) => onAllCheck(c as boolean)} />
						</Table.Head>
					{/if}
					{#each columns as column}
						<Table.Head class={cn(column.hidden && 'sr-only', column.sortColumn && 'px-0')}>
							{#if column.sortColumn}
								<Button
									variant="ghost"
									class="flex items-center"
									onclick={() =>
										onSort(
											column.sortColumn,
											requestOptions.sort?.direction === 'desc' ? 'asc' : 'desc'
										)}
								>
									{column.label}
									{#if requestOptions.sort?.column === column.sortColumn}
										<ChevronDown
											class={cn(
												'ml-2 size-4',
												requestOptions.sort?.direction === 'asc' ? 'rotate-180' : ''
											)}
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
				{#each items.data as item}
					<Table.Row class={selectedIds?.includes(item.id) ? 'bg-muted/20' : ''}>
						{#if selectedIds && !selectionDisabled}
							<Table.Cell class="w-12">
								<Checkbox
									checked={selectedIds.includes(item.id)}
									onCheckedChange={(c) => onCheck(c as boolean, item.id)}
								/>
							</Table.Cell>
						{/if}
						{@render rows({ item })}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		{#if !withoutPagination}
			<div class="mt-5 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
				<div class="flex items-center space-x-2">
					<p class="text-sm font-medium">{itemsPerPageLabel}</p>
					<Select.Root
						type="single"
						value={items.pagination.itemsPerPage.toString()}
						onValueChange={(v) => onPageSizeChange(Number(v))}
					>
						<Select.Trigger class="h-9 w-[80px]">
							{items.pagination.itemsPerPage}
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
					count={items.pagination.totalItems}
					perPage={items.pagination.itemsPerPage}
					{onPageChange}
					page={items.pagination.currentPage}
				>
					{#snippet children({ pages })}
						<Pagination.Content class="flex justify-end">
							<Pagination.Item>
								<Pagination.PrevButton />
							</Pagination.Item>
							{#each pages as page (page.key)}
								{#if page.type !== 'ellipsis' && page.value != 0}
									<Pagination.Item>
										<Pagination.Link {page} isActive={items.pagination.currentPage === page.value}>
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
	{/if}
</div>
