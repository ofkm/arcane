import type { Row, Column, FilterFn } from '@tanstack/table-core';
import type { Snippet } from 'svelte';

export type ColumnSpec<T> = {
	accessorKey?: keyof T & string;
	accessorFn?: (row: T) => any;
	id?: string;
	title: string;
	hidden?: boolean;
	sortable?: boolean;
	cell?: Snippet<[{ row: Row<T>; item: T; value: unknown }]>;
	header?: Snippet<[{ column: Column<T>; title: string; class?: string }]>;
	class?: string;
	filterFn?: FilterFn<T>;
};
