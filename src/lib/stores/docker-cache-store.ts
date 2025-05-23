import { writable, derived, get } from 'svelte/store';
import type { ContainerInfo } from 'dockerode';
import type { EnhancedImageInfo } from '$lib/types/docker';
import type { VolumeInspectInfo, NetworkInspectInfo } from 'dockerode';

interface CacheEntry<T> {
	data: T[];
	timestamp: number;
	isLoading: boolean;
	error: string | null;
}

interface DockerCache {
	containers: CacheEntry<ContainerInfo>;
	images: CacheEntry<EnhancedImageInfo>;
	networks: CacheEntry<NetworkInspectInfo>;
	volumes: CacheEntry<VolumeInspectInfo>;
	info: { data: any; timestamp: number } | null;
}

const CACHE_TTL = 30000; // 30 seconds
const STALE_WHILE_REVALIDATE_TTL = 60000; // 1 minute

// Create the initial cache state
const createInitialCache = (): DockerCache => ({
	containers: { data: [], timestamp: 0, isLoading: false, error: null },
	images: { data: [], timestamp: 0, isLoading: false, error: null },
	networks: { data: [], timestamp: 0, isLoading: false, error: null },
	volumes: { data: [], timestamp: 0, isLoading: false, error: null },
	info: null
});

// Main cache store
export const dockerCache = writable<DockerCache>(createInitialCache());

// Derived stores for each resource type
export const containers = derived(dockerCache, ($cache) => $cache.containers);
export const images = derived(dockerCache, ($cache) => $cache.images);
export const networks = derived(dockerCache, ($cache) => $cache.networks);
export const volumes = derived(dockerCache, ($cache) => $cache.volumes);
export const dockerInfo = derived(dockerCache, ($cache) => $cache.info);

// Loading states
export const isLoadingContainers = derived(containers, ($containers) => $containers.isLoading);
export const isLoadingImages = derived(images, ($images) => $images.isLoading);
export const isLoadingNetworks = derived(networks, ($networks) => $networks.isLoading);
export const isLoadingVolumes = derived(volumes, ($volumes) => $volumes.isLoading);

// Computed data
export const containerStats = derived(containers, ($containers) => {
	const data = $containers.data;
	return {
		total: data.length,
		running: data.filter((c) => c.State === 'running').length,
		stopped: data.filter((c) => c.State === 'exited').length,
		paused: data.filter((c) => c.State === 'paused').length
	};
});

// Cache management functions
class DockerCacheManager {
	private updateTimers = new Map<string, NodeJS.Timeout>();

	// Check if data is fresh
	private isFresh(timestamp: number): boolean {
		return Date.now() - timestamp < CACHE_TTL;
	}

	// Check if data is stale but usable
	private isStaleButUsable(timestamp: number): boolean {
		return Date.now() - timestamp < STALE_WHILE_REVALIDATE_TTL;
	}

	// Generic cache updater
	private updateCache<T>(resource: keyof DockerCache, updates: Partial<CacheEntry<T>> | { data: any; timestamp: number }) {
		dockerCache.update((cache) => ({
			...cache,
			[resource]: { ...cache[resource as keyof DockerCache], ...updates }
		}));
	}

	// Set loading state
	setLoading(resource: 'containers' | 'images' | 'networks' | 'volumes', isLoading: boolean) {
		this.updateCache(resource, { isLoading });
	}

	// Update containers with optimistic updates
	updateContainers(newContainers: ContainerInfo[], optimistic = false) {
		const timestamp = optimistic ? get(containers).timestamp : Date.now();

		this.updateCache('containers', {
			data: newContainers,
			timestamp,
			isLoading: false,
			error: null
		});

		// If optimistic, schedule a real update
		if (optimistic) {
			this.scheduleRevalidation('containers', 1000);
		}
	}

	// Optimistically update a single container
	updateContainer(containerId: string, updates: Partial<ContainerInfo>) {
		const currentContainers = get(containers).data;
		const updatedContainers = currentContainers.map((container) => (container.Id === containerId ? { ...container, ...updates } : container));

		this.updateContainers(updatedContainers, true);
	}

	// Remove container optimistically
	removeContainer(containerId: string) {
		const currentContainers = get(containers).data;
		const filteredContainers = currentContainers.filter((c) => c.Id !== containerId);

		this.updateContainers(filteredContainers, true);
	}

	// Add container optimistically
	addContainer(newContainer: ContainerInfo) {
		const currentContainers = get(containers).data;
		const updatedContainers = [newContainer, ...currentContainers];

		this.updateContainers(updatedContainers, true);
	}

	// Update other resources
	updateImages(newImages: EnhancedImageInfo[]) {
		this.updateCache('images', {
			data: newImages,
			timestamp: Date.now(),
			isLoading: false,
			error: null
		});
	}

	updateNetworks(newNetworks: NetworkInspectInfo[]) {
		this.updateCache('networks', {
			data: newNetworks,
			timestamp: Date.now(),
			isLoading: false,
			error: null
		});
	}

	updateVolumes(newVolumes: VolumeInspectInfo[]) {
		this.updateCache('volumes', {
			data: newVolumes,
			timestamp: Date.now(),
			isLoading: false,
			error: null
		});
	}

	updateDockerInfo(info: any) {
		this.updateCache('info', {
			data: info,
			timestamp: Date.now()
		});
	}

	// Set error state
	setError(resource: 'containers' | 'images' | 'networks' | 'volumes', error: string) {
		this.updateCache(resource, {
			isLoading: false,
			error
		});
	}

	// Check if we should fetch data
	shouldFetch(resource: 'containers' | 'images' | 'networks' | 'volumes'): boolean {
		const cache = get(dockerCache)[resource] as CacheEntry<any>;

		// Always fetch if no data
		if (cache.data.length === 0 && !cache.isLoading) return true;

		// Don't fetch if currently loading
		if (cache.isLoading) return false;

		// Fetch if data is stale
		return !this.isFresh(cache.timestamp);
	}

	// Get data with freshness info
	getData<T>(resource: 'containers' | 'images' | 'networks' | 'volumes'): {
		data: T[];
		isFresh: boolean;
		isStale: boolean;
		isLoading: boolean;
		error: string | null;
	} {
		const cache = get(dockerCache)[resource] as CacheEntry<T>;

		return {
			data: cache.data,
			isFresh: this.isFresh(cache.timestamp),
			isStale: !this.isStaleButUsable(cache.timestamp),
			isLoading: cache.isLoading,
			error: cache.error
		};
	}

	// Schedule background revalidation
	private scheduleRevalidation(resource: string, delay: number) {
		// Clear existing timer
		const existingTimer = this.updateTimers.get(resource);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Schedule new update
		const timer = setTimeout(() => {
			this.updateTimers.delete(resource);
			// Trigger revalidation event
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('docker-cache-revalidate', {
						detail: { resource }
					})
				);
			}
		}, delay);

		this.updateTimers.set(resource, timer);
	}

	// Clear cache
	clearCache(resource?: keyof DockerCache) {
		if (resource) {
			if (resource === 'info') {
				this.updateCache('info', { data: null, timestamp: 0 });
			} else {
				this.updateCache(resource, {
					data: [],
					timestamp: 0,
					isLoading: false,
					error: null
				});
			}
		} else {
			dockerCache.set(createInitialCache());
		}
	}

	// Invalidate specific resource (mark as stale)
	invalidate(resource: keyof DockerCache) {
		if (resource === 'info') {
			const current = get(dockerCache).info;
			if (current) {
				this.updateCache('info', { ...current, timestamp: 0 });
			}
		} else {
			const current = get(dockerCache)[resource] as CacheEntry<any>;
			this.updateCache(resource, { ...current, timestamp: 0 });
		}
	}
}

// Export singleton instance
export const dockerCacheManager = new DockerCacheManager();

// Utility function to find container by ID
export const findContainer = derived(containers, ($containers) => {
	return (id: string) => $containers.data.find((c) => c.Id === id);
});

// Quick container state check
export const getContainerState = (containerId: string): string | null => {
	const container = get(findContainer)(containerId);
	return container?.State || null;
};

// Export action helpers for common operations
export const dockerCacheActions = {
	// Container actions with optimistic updates
	startContainer(id: string) {
		dockerCacheManager.updateContainer(id, { State: 'running' });
	},

	stopContainer(id: string) {
		dockerCacheManager.updateContainer(id, { State: 'exited' });
	},

	restartContainer(id: string) {
		// First show as restarting, then running
		dockerCacheManager.updateContainer(id, { State: 'restarting' });
		setTimeout(() => {
			dockerCacheManager.updateContainer(id, { State: 'running' });
		}, 500);
	},

	removeContainer(id: string) {
		dockerCacheManager.removeContainer(id);
	},

	createContainer(container: ContainerInfo) {
		dockerCacheManager.addContainer(container);
	}
};
