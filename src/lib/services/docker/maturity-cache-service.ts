import type { ImageMaturity } from '$lib/types/docker/image.type';
import { maturityStore, updateImageMaturity } from '$lib/stores/maturity-store';
import { get } from 'svelte/store';

export class MaturityCache {
	private cache: Map<string, { data: ImageMaturity | undefined; timestamp: number }> = new Map();
	private maxEntries: number = 100; // Default limit
	private ttlMs: number = 30 * 60 * 1000; // 30 minutes default

	constructor(options?: { maxEntries?: number; ttlMinutes?: number }) {
		if (options?.maxEntries) this.maxEntries = options.maxEntries;
		if (options?.ttlMinutes) this.ttlMs = options.ttlMinutes * 60 * 1000;

		// Initialize from existing store
		this.initFromStore();
	}

	// Get a value from cache, return undefined if not found or expired
	get(imageId: string): ImageMaturity | undefined {
		const entry = this.cache.get(imageId);
		if (!entry) return undefined;

		// Check if the entry has expired
		if (Date.now() - entry.timestamp > this.ttlMs) {
			this.delete(imageId);
			return undefined;
		}

		// Update LRU status by removing and adding back
		this.cache.delete(imageId);
		this.cache.set(imageId, entry);

		return entry.data;
	}

	// Add or update a value in the cache
	set(imageId: string, data: ImageMaturity | undefined): void {
		// If at capacity, remove oldest entry (first in the Map)
		if (this.cache.size >= this.maxEntries) {
			const firstKey = this.cache.keys().next().value;
			if (typeof firstKey === 'string') {
				this.delete(firstKey);
			}
		}

		// Add new entry
		this.cache.set(imageId, {
			data,
			timestamp: Date.now()
		});

		// Update the store too
		updateImageMaturity(imageId, data);
	}

	// Remove an entry from cache
	delete(imageId: string): void {
		this.cache.delete(imageId);
		updateImageMaturity(imageId, undefined);
	}

	// Initialize cache from maturity store
	private initFromStore(): void {
		const storeData = get(maturityStore);
		const entries = Object.entries(storeData.maturityData);

		// Take only up to maxEntries
		entries.slice(0, this.maxEntries).forEach(([imageId, maturity]) => {
			this.cache.set(imageId, {
				data: maturity,
				timestamp: storeData.lastChecked?.getTime() || Date.now()
			});
		});
	}

	// Clear all items from cache
	clear(): void {
		this.cache.clear();
	}

	// Get cache stats
	getStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: this.maxEntries
		};
	}
}

// Create a singleton instance
export const maturityCache = new MaturityCache({
	maxEntries: 200, // Adjust based on your use case
	ttlMinutes: 60 // Cache entries expire after 1 hour
});
