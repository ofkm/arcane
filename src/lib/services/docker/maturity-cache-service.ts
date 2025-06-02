import type { ImageMaturity } from '$lib/types/docker/image.type';
import { maturityStore, updateImageMaturity } from '$lib/stores/maturity-store';
import { get } from 'svelte/store';

interface CacheNode {
	key: string;
	data: ImageMaturity | undefined;
	timestamp: number;
	prev: CacheNode | null;
	next: CacheNode | null;
}

export class MaturityCache {
	private cache: Map<string, CacheNode> = new Map();
	private head: CacheNode | null = null;
	private tail: CacheNode | null = null;
	private maxEntries: number = 100;
	private ttlMs: number = 30 * 60 * 1000;
	private hits = 0;
	private misses = 0;

	constructor(options?: { maxEntries?: number; ttlMinutes?: number }) {
		if (options?.maxEntries) this.maxEntries = options.maxEntries;
		if (options?.ttlMinutes) this.ttlMs = options.ttlMinutes * 60 * 1000;

		// Initialize from existing store
		this.initFromStore();
	}

	// Get a value from cache - O(1) operation
	get(imageId: string): ImageMaturity | undefined {
		const node = this.cache.get(imageId);
		if (!node) {
			this.misses++;
			return undefined;
		}

		// Check if expired
		if (Date.now() - node.timestamp > this.ttlMs) {
			this.delete(imageId);
			this.misses++;
			return undefined;
		}

		// Move to head (most recently used) - O(1) operation
		this.hits++;
		this.moveToHead(node);
		return node.data;
	}

	// Add or update a value - O(1) operation
	set(imageId: string, data: ImageMaturity | undefined): void {
		const existingNode = this.cache.get(imageId);

		if (existingNode) {
			// Update existing node
			existingNode.data = data;
			existingNode.timestamp = Date.now();
			this.moveToHead(existingNode);
		} else {
			// Create new node
			const newNode: CacheNode = {
				key: imageId,
				data,
				timestamp: Date.now(),
				prev: null,
				next: null
			};

			// Remove least recently used if at capacity
			if (this.cache.size >= this.maxEntries) {
				this.removeTail();
			}

			// Add to head
			this.addToHead(newNode);
			this.cache.set(imageId, newNode);
		}

		// Update store only when necessary (debounced)
		this.debouncedStoreUpdate(imageId, data);
	}

	// O(1) removal
	delete(imageId: string): void {
		const node = this.cache.get(imageId);
		if (!node) return;

		this.removeNode(node);
		this.cache.delete(imageId);
		this.debouncedStoreUpdate(imageId, undefined);
	}

	// Efficient LRU operations
	private addToHead(node: CacheNode): void {
		node.prev = null;
		node.next = this.head;

		if (this.head) {
			this.head.prev = node;
		}

		this.head = node;

		if (!this.tail) {
			this.tail = node;
		}
	}

	private removeNode(node: CacheNode): void {
		if (node.prev) {
			node.prev.next = node.next;
		} else {
			this.head = node.next || null;
		}

		if (node.next) {
			node.next.prev = node.prev;
		} else {
			this.tail = node.prev || null;
		}
	}

	private moveToHead(node: CacheNode): void {
		this.removeNode(node);
		this.addToHead(node);
	}

	private removeTail(): void {
		if (!this.tail) return;

		const lastNode = this.tail;
		this.removeNode(lastNode);
		this.cache.delete(lastNode.key);
	}

	// Debounced store updates to avoid excessive writes
	private storeUpdateTimeouts = new Map<string, NodeJS.Timeout>();

	private debouncedStoreUpdate(imageId: string, data: ImageMaturity | undefined): void {
		// Clear existing timeout
		const existingTimeout = this.storeUpdateTimeouts.get(imageId);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Set new timeout
		const timeout = setTimeout(() => {
			updateImageMaturity(imageId, data);
			this.storeUpdateTimeouts.delete(imageId);
		}, 100); // 100ms debounce

		this.storeUpdateTimeouts.set(imageId, timeout);
	}

	// Initialize cache from maturity store
	private async initFromStore(): Promise<void> {
		try {
			const storeData = get(maturityStore);

			if (!storeData.maturityData) return;

			// Convert to array and sort by priority/usage
			const entries = Object.entries(storeData.maturityData)
				.filter(([_, maturity]) => maturity !== undefined)
				.slice(0, this.maxEntries); // Limit from start

			// Initialize in chunks to avoid blocking
			const chunkSize = 50;
			for (let i = 0; i < entries.length; i += chunkSize) {
				const chunk = entries.slice(i, i + chunkSize);

				// Process chunk
				for (const [imageId, maturity] of chunk) {
					const node: CacheNode = {
						key: imageId,
						data: maturity,
						timestamp: storeData.lastChecked?.getTime() || Date.now(),
						prev: null,
						next: null
					};

					this.cache.set(imageId, node);
					this.addToHead(node);
				}

				// Yield control to event loop
				if (i + chunkSize < entries.length) {
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
			}
		} catch (error) {
			console.warn('Failed to initialize maturity cache from store:', error);
		}
	}

	// Clear all items from cache
	clear(): void {
		this.cache.clear();
		this.head = null;
		this.tail = null;
	}

	// Get cache stats
	getStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: this.maxEntries
		};
	}

	// Batch get multiple entries
	getBatch(imageIds: string[]): Map<string, ImageMaturity | undefined> {
		const results = new Map<string, ImageMaturity | undefined>();
		const now = Date.now();

		for (const imageId of imageIds) {
			const node = this.cache.get(imageId);
			if (node && now - node.timestamp <= this.ttlMs) {
				results.set(imageId, node.data);
				// Move to head without individual operations
				this.moveToHead(node);
			}
		}

		return results;
	}

	// Batch set multiple entries
	setBatch(entries: Map<string, ImageMaturity | undefined>): void {
		const updates: Array<[string, ImageMaturity | undefined]> = [];

		for (const [imageId, data] of entries) {
			const existingNode = this.cache.get(imageId);

			if (existingNode) {
				existingNode.data = data;
				existingNode.timestamp = Date.now();
				this.moveToHead(existingNode);
			} else {
				if (this.cache.size >= this.maxEntries) {
					this.removeTail();
				}

				const newNode: CacheNode = {
					key: imageId,
					data,
					timestamp: Date.now(),
					prev: null,
					next: null
				};

				this.addToHead(newNode);
				this.cache.set(imageId, newNode);
			}

			updates.push([imageId, data]);
		}

		// Batch update store
		this.batchStoreUpdate(updates);
	}

	private batchStoreUpdate(updates: Array<[string, ImageMaturity | undefined]>): void {
		// Group updates and send as single operation
		setTimeout(() => {
			for (const [imageId, data] of updates) {
				updateImageMaturity(imageId, data);
			}
		}, 50);
	}

	// Background cleanup of expired entries
	private cleanupInterval: NodeJS.Timeout | null = null;

	startBackgroundCleanup(intervalMinutes = 10): void {
		if (this.cleanupInterval) return;

		this.cleanupInterval = setInterval(
			() => {
				this.cleanupExpired();
			},
			intervalMinutes * 60 * 1000
		);
	}

	stopBackgroundCleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}

	private cleanupExpired(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		// Walk from tail (oldest) to head
		let current = this.tail;
		while (current) {
			if (now - current.timestamp > this.ttlMs) {
				expiredKeys.push(current.key);
				current = current.prev;
			} else {
				// Since we're walking from oldest to newest,
				// we can break early when we find a non-expired entry
				break;
			}
		}

		// Remove expired entries
		for (const key of expiredKeys) {
			this.delete(key);
		}

		console.log(`Cleaned up ${expiredKeys.length} expired maturity cache entries`);
	}

	// Add cache invalidation strategies
	invalidatePattern(pattern: RegExp): number {
		let invalidatedCount = 0;
		const keysToDelete: string[] = [];

		for (const [key] of this.cache) {
			if (pattern.test(key)) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.delete(key);
			invalidatedCount++;
		}

		return invalidatedCount;
	}

	invalidateRepository(repository: string): number {
		const pattern = new RegExp(`^${repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
		return this.invalidatePattern(pattern);
	}

	// Get cache efficiency metrics
	getMetrics(): {
		hitRate: number;
		size: number;
		maxSize: number;
		oldestEntry: number;
		averageAge: number;
	} {
		if (this.cache.size === 0) {
			return {
				hitRate: 0,
				size: 0,
				maxSize: this.maxEntries,
				oldestEntry: 0,
				averageAge: 0
			};
		}

		const now = Date.now();
		let totalAge = 0;
		let oldestEntry = now;

		for (const [_, node] of this.cache) {
			const age = now - node.timestamp;
			totalAge += age;
			if (node.timestamp < oldestEntry) {
				oldestEntry = node.timestamp;
			}
		}

		return {
			hitRate: this.hits / Math.max(this.hits + this.misses, 1),
			size: this.cache.size,
			maxSize: this.maxEntries,
			oldestEntry: now - oldestEntry,
			averageAge: totalAge / this.cache.size
		};
	}
}

// Create optimized singleton
export const maturityCache = new MaturityCache({
	maxEntries: 500, // Increased for better hit rate
	ttlMinutes: 120 // 2 hours for better persistence
});

// Start background cleanup
maturityCache.startBackgroundCleanup(15); // Every 15 minutes

// Export convenience functions
export const getImageMaturity = (imageId: string) => maturityCache.get(imageId);
export const setImageMaturity = (imageId: string, maturity: ImageMaturity | undefined) => maturityCache.set(imageId, maturity);
export const getImageMaturityBatch = (imageIds: string[]) => maturityCache.getBatch(imageIds);
export const setImageMaturityBatch = (entries: Map<string, ImageMaturity | undefined>) => maturityCache.setBatch(entries);
