import type { ColumnFiltersState } from '@tanstack/table-core';
import type { FilterMap } from '$lib/types/pagination.type';
import type { CompactTablePrefs, FieldSpec } from './arcane-table.types.svelte';
import { decodeFilters, applyMobileHiddenPatch } from './arcane-table.types.svelte';

export type PersistedPreferencesSnapshot = {
	hiddenColumns: string[];
	restoredFilters: ColumnFiltersState;
	filtersMap: FilterMap;
	search: string;
	limit: number;
	mobileHidden?: string[];
};

export function toFilterMap(filters: ColumnFiltersState): FilterMap {
	const out: FilterMap = {};
	for (const f of filters ?? []) {
		const id = f.id;
		let value: unknown = (f as any).value;
		if (Array.isArray(value)) {
			if (value.length === 0) continue;
			value = value[0];
		} else if (value && typeof value === 'object' && value instanceof Set) {
			const first = (value as Set<unknown>).values().next().value;
			if (first === undefined) continue;
			value = first;
		}
		if (value !== undefined && value !== null && String(value).trim() !== '') {
			out[id] = value as any;
		}
	}
	return out;
}

export function filterMapsEqual(a?: FilterMap, b?: FilterMap): boolean {
	const keysA = Object.keys(a ?? {});
	const keysB = Object.keys(b ?? {});
	if (keysA.length !== keysB.length) return false;
	const mapB = b ?? {};
	for (const key of keysA) {
		const valueA = (a ?? {})[key];
		const valueB = mapB[key];
		if (Array.isArray(valueA) || Array.isArray(valueB)) {
			if (!Array.isArray(valueA) || !Array.isArray(valueB)) return false;
			if (valueA.length !== valueB.length) return false;
			for (let i = 0; i < valueA.length; i += 1) {
				if (`${valueA[i]}` !== `${valueB[i]}`) return false;
			}
			continue;
		}
		if (valueA !== valueB) {
			if (valueA == null || valueB == null) return false;
			if (`${valueA}` !== `${valueB}`) return false;
		}
	}
	return true;
}

export function extractPersistedPreferences(
	current: CompactTablePrefs | undefined,
	fallbackLimit: number
): PersistedPreferencesSnapshot {
	const prefs = current ?? { v: [], f: [], g: '', l: fallbackLimit };
	const restoredFilters = decodeFilters(prefs.f);
	const filtersMap = toFilterMap(restoredFilters);
	const search = (prefs.g ?? '').trim();
	const limit = prefs.l ?? fallbackLimit;

	return {
		hiddenColumns: prefs.v ?? [],
		restoredFilters,
		filtersMap,
		search,
		limit,
		mobileHidden: prefs.m
	};
}

export function buildInitialMobileVisibility(
	fields: FieldSpec[],
	mobileFieldVisibility: Record<string, boolean>,
	persistedHidden?: string[]
): Record<string, boolean> | null {
	if (!fields.length || Object.keys(mobileFieldVisibility).length) return null;
	const initial: Record<string, boolean> = {};
	for (const field of fields) {
		initial[field.id] = field.defaultVisible ?? true;
	}
	if (persistedHidden && persistedHidden.length > 0) {
		applyMobileHiddenPatch(initial, persistedHidden);
	}
	return initial;
}
