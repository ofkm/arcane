import settingsStore from '$lib/stores/config-store';
import { get } from 'svelte/store';

type SkipCacheUntil = {
	[key: string]: number;
};

export function getApplicationLogo(full = false): string {
	const settings = get(settingsStore);
	const accentColor = settings?.accentColor || 'default';

	// Add accent color as query param to bust cache when color changes
	const baseUrl = full ? '/api/app-images/logo?full=true' : '/api/app-images/logo';
	const separator = full ? '&' : '?';
	const urlWithColor = `${baseUrl}${separator}color=${encodeURIComponent(accentColor)}`;

	return getCachedImageUrl(urlWithColor);
}
export function getDefaultProfilePicture(): string {
	return getCachedImageUrl('/api/app-images/profile');
}

function getCachedImageUrl(url: string) {
	const skipCacheUntil = getSkipCacheUntil(url);
	const skipCache = skipCacheUntil > Date.now();
	if (skipCache) {
		const separator = url.includes('?') ? '&' : '?';
		url += separator + 'skip-cache=' + skipCacheUntil.toString();
	}

	return url.toString();
}

function getSkipCacheUntil(url: string) {
	const skipCacheUntil: SkipCacheUntil = JSON.parse(localStorage.getItem('skip-cache-until') ?? '{}');
	return skipCacheUntil[hashKey(url)] ?? 0;
}

function hashKey(key: string): string {
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		const char = key.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36);
}
