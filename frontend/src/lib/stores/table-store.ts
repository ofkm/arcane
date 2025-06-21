import { PersistedState } from 'runed';

export interface PageSizes {
	default: number;
	containers: number;
	images: number;
	volumes: number;
	networks: number;
	stacks: number;
	[key: string]: number; // Allow additional dynamic keys
}

// Create default values
const DEFAULT_PAGE_SIZES: PageSizes = {
	default: 10,
	containers: 10,
	images: 10,
	volumes: 10,
	networks: 10,
	stacks: 10
};

// Single persisted state for all page sizes
export const tablePageSizes = new PersistedState<PageSizes>('arcane-table-page-sizes', DEFAULT_PAGE_SIZES, {
	storage: 'local',
	syncTabs: true
});

// Backward compatibility helpers
export const tablePersistence = {
	// Get a page size value for a specific table
	getPageSize: (tableKey: string): number => {
		return tablePageSizes.current[tableKey] || 10;
	},

	// Set a page size value for a specific table
	setPageSize: (tableKey: string, value: number): void => {
		tablePageSizes.current = {
			...tablePageSizes.current,
			[tableKey]: value
		};
	}
};

// Usage examples:
// Access directly:
// const containerPageSize = tablePageSizes.current.containers;
//
// Update directly:
// tablePageSizes.current = { ...tablePageSizes.current, containers: 20 };
//
// Or use the compatibility helpers:
// tablePersistence.setPageSize('images', 20);
