<script lang="ts" generics="TData">
	import XIcon from '@lucide/svelte/icons/x';
	import type { Table } from '@tanstack/table-core';
	import { DataTableFacetedFilter, DataTableViewOptions } from './index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { imageUpdateFilters, usageFilters } from './data.js';

	let { table }: { table: Table<TData> } = $props();

	const isFiltered = $derived(table.getState().columnFilters.length > 0);
	const usageColumn = $derived(table.getColumn('inUse'));
	const updatesColumn = $derived(table.getColumn('updates'));
</script>

<div class="flex items-center justify-between">
	<div class="flex flex-1 items-center space-x-2">
		<Input
			placeholder="Search..."
			value={(table.getState().globalFilter as string) ?? ''}
			oninput={(e) => table.setGlobalFilter(e.currentTarget.value)}
			onchange={(e) => table.setGlobalFilter(e.currentTarget.value)}
			class="h-8 w-[150px] lg:w-[250px]"
		/>

		{#if usageColumn}
			<DataTableFacetedFilter column={usageColumn} title="Usage" showCheckboxes={false} options={usageFilters} />
		{/if}
		{#if updatesColumn}
			<DataTableFacetedFilter column={updatesColumn} title="Updates" options={imageUpdateFilters} />
		{/if}

		{#if isFiltered}
			<Button
				variant="ghost"
				onclick={() => {
					table.resetColumnFilters();
					table.resetGlobalFilter();
				}}
				class="h-8 px-2 lg:px-3"
			>
				Reset
				<XIcon />
			</Button>
		{/if}
	</div>
	<DataTableViewOptions {table} />
</div>
