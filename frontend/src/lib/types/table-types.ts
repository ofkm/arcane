import { type ColumnDef } from '@tanstack/table-core';

export type FeatureFlags = {
	sorting?: boolean;
	filtering?: boolean;
	selection?: boolean;
};

export type PaginationOptions = {
	pageSize?: number;
	pageSizeOptions?: number[];
	itemsPerPageLabel?: string;
};

export type DisplayOptions = {
	filterPlaceholder?: string;
	noResultsMessage?: string;
	isDashboardTable?: boolean;
	class?: string;
};

export type SortOptions = {
	defaultSort?: { id: string; desc: boolean };
};

export type UniversalTableProps<TData> = {
	columns: ColumnDef<TData, any>[];
	data: TData[];
	features?: FeatureFlags;
	display?: DisplayOptions;
	pagination?: PaginationOptions;
	sort?: SortOptions;
	selectedIds?: string[];
};
